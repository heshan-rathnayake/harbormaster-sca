import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
  DEBUG_ENDPOINTS: z.stringbool().default(false),
  DATABASE_URL: z.url(),
});

export const relayEnvSchema = envSchema.extend({
  KAFKA_BROKERS: z
    .string()
    .transform((value) => value.split(",").map((broker) => broker.trim()))
    .pipe(z.array(z.string().min(1)).min(1)),
});

export type Env = z.infer<typeof envSchema>;
export type RelayEnv = z.infer<typeof relayEnvSchema>;

function parse<Schema extends z.ZodType>(
  schema: Schema,
  raw: Record<string, unknown>,
): z.infer<Schema> {
  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  return parse(envSchema, raw);
}

export function validateRelayEnv(raw: Record<string, unknown>): RelayEnv {
  return parse(relayEnvSchema, raw);
}
