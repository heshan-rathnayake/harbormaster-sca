import { validateEnv } from "./env.js";

const requiredVars = {
  DATABASE_URL: "postgresql://localhost:5432/test",
};

const fullVars = {
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: 4040,
  ...requiredVars,
};

describe("validateEnv", () => {
  it("fills in the default values when only the required environment variables are provided", () => {
    const env = validateEnv(requiredVars);

    expect(env).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
      DATABASE_URL: "postgresql://localhost:5432/test",
    });
  });

  it("returns the provided values when all environment variables are provided", () => {
    const env = validateEnv(fullVars);

    expect(env).toEqual(fullVars);
  });

  it("rejects a missing DATABASE_URL and names it in the message", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a PORT that is not a number", () => {
    expect(() =>
      validateEnv({ ...requiredVars, PORT: "not-a-number" }),
    ).toThrow(/PORT/);
  });
});
