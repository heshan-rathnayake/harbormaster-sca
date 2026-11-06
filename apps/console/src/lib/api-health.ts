import { z } from "zod";

const TIMEOUT_MS = 2_000;

export type ApiHealth =
  | { status: "ready" }
  | { status: "not-ready"; failing: string[] }
  | { status: "unreachable"; reason: string };

const notReadyBody = z.object({
  error: z.record(z.string(), z.unknown()),
});

export async function getApiHealth(apiUrl: string): Promise<ApiHealth> {
  let response: Response;
  try {
    response = await fetch(new URL("/readyz", apiUrl), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return {
      status: "unreachable",
      reason: timedOut
        ? `No response within ${TIMEOUT_MS / 1000} s`
        : "Could not connect",
    };
  }

  if (response.ok) {
    return { status: "ready" };
  }

  if (response.status === 503) {
    const body = notReadyBody.safeParse(
      await response.json().catch(() => null),
    );
    if (body.success) {
      return { status: "not-ready", failing: Object.keys(body.data.error) };
    }
  }

  return {
    status: "unreachable",
    reason: `Unexpected response: HTTP ${response.status}`,
  };
}
