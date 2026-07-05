import type { z } from "zod";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: string[] };

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`),
  };
}
