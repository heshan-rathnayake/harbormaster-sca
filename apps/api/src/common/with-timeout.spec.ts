import { withTimeout } from "./with-timeout.js";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fails with the given message when the work takes too long", async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => undefined);

    const result = expect(withTimeout(never, 1000, "too slow")).rejects.toThrow(
      "too slow",
    );

    await vi.advanceTimersByTimeAsync(1000);

    await result;
  });

  it("returns the result when the work finishes in time", async () => {
    const done = Promise.resolve("done");

    const result = await withTimeout(done, 1000, "too slow");

    expect(result).toBe("done");
  });

  it("passes on the work's own error", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("broken")), 1000, "too slow"),
    ).rejects.toThrow("broken");
  });
});
