import { ApiErrorDtoSchema, type ApiErrorDto } from "@shared/contracts/api-errors";

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiErrorDto;

  constructor(status: number, body: ApiErrorDto) {
    super(body.message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Customer-facing copy only. Never surfaces raw Error, network, or API message text.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!isApiClientError(error)) {
    return fallback;
  }

  if (error.body.code === "CONFLICT" && error.body.currentRevision !== undefined) {
    return "This was updated elsewhere. Refresh the page and try again.";
  }
  if (error.body.code === "RATE_LIMITED") {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (error.body.code === "PAYLOAD_TOO_LARGE") {
    return "That request is too large.";
  }
  if (error.body.code === "MODEL_UNAVAILABLE") {
    return "We couldn’t generate a form right now. Please try again.";
  }
  if (error.body.code === "CLOSED") {
    return "This form is no longer accepting responses.";
  }

  return fallback;
}

export async function parseApiError(response: Response): Promise<ApiClientError> {
  let body: ApiErrorDto = {
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
  };

  try {
    const json: unknown = await response.json();
    const parsed = ApiErrorDtoSchema.safeParse(json);
    if (parsed.success) {
      body = parsed.data;
    }
  } catch {
    // Keep the fallback body when the response is not JSON.
  }

  return new ApiClientError(response.status, body);
}
