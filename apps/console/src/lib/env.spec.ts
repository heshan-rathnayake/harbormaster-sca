import { validateEnv } from "./env";

vi.mock("server-only", () => ({}));

describe("validateEnv", () => {
  it("returns the config when API_URL is a URL", () => {
    expect(validateEnv({ API_URL: "http://localhost:4000" })).toEqual({
      API_URL: "http://localhost:4000",
    });
  });

  it("fails when API_URL is missing", () => {
    expect(() => validateEnv({})).toThrow(/API_URL/);
  });

  it("fails when API_URL is not a URL", () => {
    expect(() => validateEnv({ API_URL: "localhost" })).toThrow(/API_URL/);
  });
});
