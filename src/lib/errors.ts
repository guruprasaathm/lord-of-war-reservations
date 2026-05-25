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

  console.error(error);

  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}