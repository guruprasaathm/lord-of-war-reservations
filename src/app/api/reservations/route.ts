import { NextRequest, NextResponse } from "next/server";
import { createReservation } from "@/lib/reservation-service";
import { createReservationSchema } from "@/lib/validations";
import { getErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createReservationSchema.parse(body);

    const reservation = await createReservation(input);

    return NextResponse.json(
      {
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}