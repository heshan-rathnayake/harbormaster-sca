import { Logger } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { DatabaseHealthIndicator } from "./database.health.js";

async function createIndicator(queryRaw: () => Promise<unknown>) {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule],
    providers: [
      DatabaseHealthIndicator,
      { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
    ],
  }).compile();
  return moduleRef.get(DatabaseHealthIndicator);
}

describe("DatabaseHealthIndicator", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports up when the database answers", async () => {
    const indicator = await createIndicator(async () => [{ ok: 1 }]);

    await expect(indicator.isReachable()).resolves.toEqual({
      database: { status: "up" },
    });
  });

  it("reports down and logs the cause, without putting it in the result", async () => {
    const indicator = await createIndicator(async () => {
      throw new Error("Cannot reach database server at 10.0.0.5:5432");
    });

    const result = await indicator.isReachable();

    expect(result).toEqual({ database: { status: "down" } });
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
    expect(Logger.prototype.error).toHaveBeenCalledOnce();
  });

  it("reports down when the database does not answer in time", async () => {
    vi.useFakeTimers();
    const indicator = await createIndicator(() => new Promise(() => undefined));

    const pending = indicator.isReachable();
    await vi.advanceTimersByTimeAsync(1500);

    await expect(pending).resolves.toEqual({ database: { status: "down" } });
  });
});
