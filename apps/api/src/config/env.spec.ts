import { validateEnv, validateRelayEnv } from "./env.js";

const requiredVars = {
  DATABASE_URL: "postgresql://localhost:5432/test",
};

const fullVars = {
  ...requiredVars,
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: "4040",
  LOG_FORMAT: "pretty",
  DEBUG_ENDPOINTS: "true",
};

const relayVars = {
  ...requiredVars,
  KAFKA_BROKERS: "localhost:19092",
};

describe("validateEnv", () => {
  it("fills in the default values when only the required environment variables are provided", () => {
    const env = validateEnv(requiredVars);

    expect(env).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
      LOG_FORMAT: "json",
      DEBUG_ENDPOINTS: false,
      DATABASE_URL: "postgresql://localhost:5432/test",
    });
  });

  it("returns the provided values when all environment variables are provided", () => {
    const env = validateEnv(fullVars);

    expect(env).toEqual({ ...fullVars, PORT: 4040, DEBUG_ENDPOINTS: true });
  });

  it("rejects a missing DATABASE_URL and names it in the message", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a PORT that is not a number", () => {
    expect(() =>
      validateEnv({ ...requiredVars, PORT: "not-a-number" }),
    ).toThrow(/PORT/);
  });

  it("rejects a LOG_FORMAT other than json or pretty", () => {
    expect(() => validateEnv({ ...requiredVars, LOG_FORMAT: "xml" })).toThrow(
      /LOG_FORMAT/,
    );
  });

  it("rejects a DEBUG_ENDPOINTS that is not a true or false", () => {
    expect(() =>
      validateEnv({ ...requiredVars, DEBUG_ENDPOINTS: "not-a-boolean" }),
    ).toThrow(/DEBUG_ENDPOINTS/);
  });
});

describe("validateRelayEnv", () => {
  it("adds the broker list to the API's settings", () => {
    const env = validateRelayEnv(relayVars);

    expect(env).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
      LOG_FORMAT: "json",
      DEBUG_ENDPOINTS: false,
      DATABASE_URL: "postgresql://localhost:5432/test",
      KAFKA_BROKERS: ["localhost:19092"],
    });
  });

  it("splits a comma-separated broker list", () => {
    const env = validateRelayEnv({
      ...requiredVars,
      KAFKA_BROKERS: "broker-1:9092, broker-2:9092",
    });

    expect(env.KAFKA_BROKERS).toEqual(["broker-1:9092", "broker-2:9092"]);
  });

  it("rejects a missing KAFKA_BROKERS", () => {
    expect(() => validateRelayEnv({ ...requiredVars })).toThrow(
      /KAFKA_BROKERS/,
    );
  });

  it("rejects an empty entry in the broker list", () => {
    expect(() =>
      validateRelayEnv({
        ...requiredVars,
        KAFKA_BROKERS: "localhost:19092,",
      }),
    ).toThrow(/KAFKA_BROKERS/);
  });
});
