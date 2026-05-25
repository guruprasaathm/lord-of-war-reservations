import crypto from "crypto";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

type IdempotentResult = {
  statusCode: number;
  body: unknown;
};

const IDEMPOTENCY_TTL_HOURS = 24;
const PROCESSING_STATUS_CODE = 102;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;

  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}

function hashRequestBody(body: unknown) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(body))
    .digest("hex");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExistingResponse(
  key: string,
  method: string,
  path: string,
  expectedRequestHash: string
): Promise<IdempotentResult> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        key_method_path: {
          key,
          method,
          path,
        },
      },
    });

    if (!existing) {
      throw new AppError(409, "Idempotency key is being initialized");
    }

    if (existing.requestHash !== expectedRequestHash) {
      throw new AppError(
        409,
        "Idempotency key reused with a different request payload"
      );
    }

    if (existing.statusCode !== PROCESSING_STATUS_CODE) {
      return {
        statusCode: existing.statusCode,
        body: existing.responseBody,
      };
    }

    await delay(100);
  }

  throw new AppError(
    409,
    "Request with this idempotency key is still processing"
  );
}

export async function withIdempotency(
  request: NextRequest,
  requestBody: unknown,
  handler: () => Promise<IdempotentResult>
): Promise<IdempotentResult> {
  const key = request.headers.get("Idempotency-Key");

  if (!key) {
    return handler();
  }

  const method = request.method;
  const path = new URL(request.url).pathname;
  const requestHash = hashRequestBody(requestBody);
  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000
  );

  try {
    await prisma.idempotencyKey.create({
      data: {
        key,
        method,
        path,
        requestHash,
        statusCode: PROCESSING_STATUS_CODE,
        responseBody: {
          status: "PROCESSING",
        },
        expiresAt,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return waitForExistingResponse(key, method, path, requestHash);
    }

    throw error;
  }

  try {
    const result = await handler();

    await prisma.idempotencyKey.update({
      where: {
        key_method_path: {
          key,
          method,
          path,
        },
      },
      data: {
        statusCode: result.statusCode,
        responseBody: result.body as Prisma.InputJsonValue,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof AppError) {
      const result = {
        statusCode: error.statusCode,
        body: {
          error: error.message,
        },
      };

      await prisma.idempotencyKey.update({
        where: {
          key_method_path: {
            key,
            method,
            path,
          },
        },
        data: {
          statusCode: result.statusCode,
          responseBody: result.body,
        },
      });

      return result;
    }

    console.error(error);

    const result = {
      statusCode: 500,
      body: {
        error: "Internal server error",
      },
    };

    await prisma.idempotencyKey.update({
      where: {
        key_method_path: {
          key,
          method,
          path,
        },
      },
      data: {
        statusCode: result.statusCode,
        responseBody: result.body,
      },
    });

    return result;
  }
}