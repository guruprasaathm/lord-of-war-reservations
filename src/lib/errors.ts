import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function getErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Invalid request body",
        issues: error.issues,
      },
      { status: 400 }
    );
  }

  console.error(error);

  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}