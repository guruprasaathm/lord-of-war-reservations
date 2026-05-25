import { NextRequest, NextResponse } from "next/server";
import { createReservation } from "@/lib/reservation-service";
import { createReservationSchema } from "@/lib/validations";
import { getErrorResponse } from "@/lib/errors";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createReservationSchema.parse(body);

    const result = await withIdempotency(request, body, async () => {
      const reservation = await createReservation(input);

      return {
        statusCode: 201,
        body: {
          reservation,
        },
      };
    });

    return NextResponse.json(result.body, {
      status: result.statusCode,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}