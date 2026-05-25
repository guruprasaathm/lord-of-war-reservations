import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { CreateReservationInput } from "@/lib/validations";

type TransactionClient = Prisma.TransactionClient;

const RESERVATION_TTL_SECONDS = Number(
  process.env.RESERVATION_TTL_SECONDS ?? 60
);

export async function releaseExpiredReservations(
  tx: TransactionClient = prisma
) {
  const now = new Date();

  const expiredReservations = await tx.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      quantity: true,
    },
  });

  let releasedCount = 0;

  for (const reservation of expiredReservations) {
    const updated = await tx.reservation.updateMany({
      where: {
        id: reservation.id,
        status: ReservationStatus.PENDING,
      },
      data: {
        status: ReservationStatus.EXPIRED,
        releasedAt: now,
      },
    });

    if (updated.count === 1) {
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          reservedUnits: {
            decrement: reservation.quantity,
          },
        },
      });

      releasedCount++;
    }
  }

  return releasedCount;
}

export async function createReservation(input: CreateReservationInput) {
  const expiresAt = new Date(
    Date.now() + RESERVATION_TTL_SECONDS * 1000
  );

  return prisma.$transaction(async (tx) => {
    await releaseExpiredReservations(tx);

    const updatedInventory = await tx.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      UPDATE "Inventory"
      SET 
        "reservedUnits" = "reservedUnits" + ${input.quantity},
        "updatedAt" = NOW()
      WHERE 
        "productId" = ${input.productId}
        AND "warehouseId" = ${input.warehouseId}
        AND ("totalUnits" - "reservedUnits") >= ${input.quantity}
      RETURNING "id";
    `);

    if (updatedInventory.length === 0) {
      throw new AppError(409, "Not enough stock available");
    }

    const reservation = await tx.reservation.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        guestSessionId: input.guestSessionId,
        status: ReservationStatus.PENDING,
        expiresAt,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return reservation;
  });
}

export async function getReservationById(id: string) {
  await releaseExpiredReservations();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, "Reservation not found");
  }

  return reservation;
}

export async function confirmReservation(id: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      throw new AppError(404, "Reservation not found");
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      return reservation;
    }

    if (reservation.status === ReservationStatus.RELEASED) {
      throw new AppError(409, "Reservation was already released");
    }

    if (reservation.status === ReservationStatus.EXPIRED) {
      throw new AppError(410, "Reservation has expired");
    }

    if (reservation.expiresAt <= now) {
      const expiredUpdate = await tx.reservation.updateMany({
        where: {
          id,
          status: ReservationStatus.PENDING,
        },
        data: {
          status: ReservationStatus.EXPIRED,
          releasedAt: now,
        },
      });

      if (expiredUpdate.count === 1) {
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            reservedUnits: {
              decrement: reservation.quantity,
            },
          },
        });
      }

      throw new AppError(410, "Reservation has expired");
    }

    const confirmedUpdate = await tx.reservation.updateMany({
      where: {
        id,
        status: ReservationStatus.PENDING,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: now,
      },
    });

    if (confirmedUpdate.count !== 1) {
      throw new AppError(409, "Reservation could not be confirmed");
    }

    await tx.inventory.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        totalUnits: {
          decrement: reservation.quantity,
        },
        reservedUnits: {
          decrement: reservation.quantity,
        },
      },
    });

    const confirmedReservation = await tx.reservation.findUniqueOrThrow({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return confirmedReservation;
  });
}

export async function releaseReservation(id: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      throw new AppError(404, "Reservation not found");
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      throw new AppError(409, "Confirmed reservations cannot be released");
    }

    if (
      reservation.status === ReservationStatus.RELEASED ||
      reservation.status === ReservationStatus.EXPIRED
    ) {
      return reservation;
    }

    const releasedUpdate = await tx.reservation.updateMany({
      where: {
        id,
        status: ReservationStatus.PENDING,
      },
      data: {
        status: ReservationStatus.RELEASED,
        releasedAt: now,
      },
    });

    if (releasedUpdate.count === 1) {
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          reservedUnits: {
            decrement: reservation.quantity,
          },
        },
      });
    }

    const releasedReservation = await tx.reservation.findUniqueOrThrow({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return releasedReservation;
  });
}