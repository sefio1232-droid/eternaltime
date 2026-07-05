export type ApplicationErrorCode =
  | "AUTH_UNCONFIGURED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "UNEXPECTED_ERROR";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly safeMessage: string;
  readonly status: number;

  constructor(input: {
    code: ApplicationErrorCode;
    message: string;
    safeMessage: string;
    status?: number;
  }) {
    super(input.message);
    this.name = "ApplicationError";
    this.code = input.code;
    this.safeMessage = input.safeMessage;
    this.status = input.status ?? 500;
  }
}

export function toUserSafeMessage(error: unknown): string {
  if (error instanceof ApplicationError) {
    return error.safeMessage;
  }

  return "Не удалось выполнить действие. Попробуйте ещё раз или вернитесь позже.";
}
