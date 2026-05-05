/**
 * AppError: typed error subclass that maps cleanly to a JSON HTTP response.
 */
import { z } from "zod";

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(field: string, message: string) {
    super("VALIDATION_ERROR", 400, message, { field });
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(message: string, details?: unknown) {
    super("PROVIDER_UNAVAILABLE", 503, message, details);
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super("SESSION_NOT_FOUND", 404, `Grill session ${sessionId} not found`, {
      sessionId,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "请登录后继续") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "权限不足") {
    super("FORBIDDEN", 403, message);
  }
}

export class AccessCodeRequiredError extends AppError {
  constructor(message = "需要有效的访问码") {
    super("ACCESS_CODE_REQUIRED", 403, message);
  }
}

/** Build the JSON Response envelope for any thrown error. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode },
    );
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      },
      { status: 400 },
    );
  }
  return Response.json(
    {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    },
    { status: 500 },
  );
}
