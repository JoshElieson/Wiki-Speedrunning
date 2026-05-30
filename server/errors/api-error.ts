export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function isRecoverableWikiApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return error.code === "MEDIAWIKI_HTTP_ERROR" || error.code === "MEDIAWIKI_API_ERROR";
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(500, "INTERNAL_ERROR", error.message);
  }

  return new ApiError(500, "INTERNAL_ERROR", "Unexpected server error");
}
