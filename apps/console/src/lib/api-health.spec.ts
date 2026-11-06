import { getApiHealth } from "./api-health";

const API_URL = "http://api.test:4000";
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("getApiHealth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("calls /readyz with a timeout", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "ok" }));

    await getApiHealth(API_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://api.test:4000/readyz"),
      { signal: expect.any(AbortSignal) },
    );
  });

  it("is ready when the API answers 200", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "ok" }));

    await expect(getApiHealth(API_URL)).resolves.toEqual({ status: "ready" });
  });

  it("lists the failing checks when the API answers 503", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(503, {
        status: "error",
        info: {},
        error: { database: { status: "down" } },
        details: { database: { status: "down" } },
      }),
    );

    await expect(getApiHealth(API_URL)).resolves.toEqual({
      status: "not-ready",
      failing: ["database"],
    });
  });

  it("is unreachable on any other status", async () => {
    fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));

    await expect(getApiHealth(API_URL)).resolves.toEqual({
      status: "unreachable",
      reason: "Unexpected response: HTTP 404",
    });
  });

  it("is unreachable on a 503 without a health check body", async () => {
    fetchMock.mockResolvedValue(
      new Response("Service Unavailable", { status: 503 }),
    );

    await expect(getApiHealth(API_URL)).resolves.toEqual({
      status: "unreachable",
      reason: "Unexpected response: HTTP 503",
    });
  });

  it("is unreachable when the connection fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getApiHealth(API_URL)).resolves.toEqual({
      status: "unreachable",
      reason: "Could not connect",
    });
  });

  it("is unreachable when the API is too slow", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    await expect(getApiHealth(API_URL)).resolves.toEqual({
      status: "unreachable",
      reason: "No response within 2 s",
    });
  });
});
