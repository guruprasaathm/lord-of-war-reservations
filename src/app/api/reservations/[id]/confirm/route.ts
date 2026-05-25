import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation-service";
import { getErrorResponse } from "@/lib/errors";
import { withIdempotency } from "@/lib/idempotency";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await withIdempotency(
      request,
      { reservationId: id },
      async () => {
        const reservation = await confirmReservation(id);

        return {
          statusCode: 200,
          body: {
            reservation,
          },
        };
      }
    );

    return NextResponse.json(result.body, {
      status: result.statusCode,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}