import "server-only";
import { z } from "zod";

const envSchema = z.object({
  API_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export function getEnv(): Env {
  return validateEnv(process.env);
}
