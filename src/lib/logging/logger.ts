import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogPrimitive = string | number | boolean | null | undefined;
export type LogContext = Record<string, LogPrimitive>;

const sensitiveKeyPattern = /(secret|token|password|authorization|cookie|service[_-]?role|key)$/i;

function sanitizeContext(context: LogContext = {}): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : value,
    ]),
  );
}

export function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: "An unknown error occurred.",
  };
}

export function serverLog(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = {
    level,
    message,
    context: sanitizeContext(context),
    at: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.info(JSON.stringify(entry));
}
