import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation-service";
import { getErrorResponse } from "@/lib/errors";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservation = await confirmReservation(id);

    return NextResponse.json({
      reservation,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}