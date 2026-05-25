import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation-service";

export async function GET() {
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      inventory: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      countryOfOrigin: product.countryOfOrigin,
      originFlag: product.originFlag,
      manufacturedAt: product.manufacturedAt,
      warehouses: product.inventory.map((stock) => ({
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse.name,
        warehouseCode: stock.warehouse.code,
        country: stock.warehouse.country,
        flag: stock.warehouse.flag,
        city: stock.warehouse.city,
        totalUnits: stock.totalUnits,
        reservedUnits: stock.reservedUnits,
        availableUnits: stock.totalUnits - stock.reservedUnits,
      })),
    })),
  });
}