import { ServiceUnavailableException } from "@nestjs/common";
import { TerminusModule, type HealthIndicatorResult } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { DatabaseHealthIndicator } from "./database.health.js";
import { HealthController } from "./health.controller.js";

async function createController(database: HealthIndicatorResult) {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule.forRoot({ logger: false })],
    controllers: [HealthController],
    providers: [
      {
        provide: DatabaseHealthIndicator,
        useValue: { isReachable: async () => database },
      },
    ],
  }).compile();
  return moduleRef.get(HealthController);
}

describe("HealthController", () => {
  it("reports liveness without checking any dependency", async () => {
    const controller = await createController({ database: { status: "down" } });

    await expect(controller.liveness()).resolves.toMatchObject({
      status: "ok",
      details: {},
    });
  });

  it("reports ready when the database is up", async () => {
    const controller = await createController({ database: { status: "up" } });

    await expect(controller.readiness()).resolves.toMatchObject({
      status: "ok",
      info: { database: { status: "up" } },
    });
  });

  it("answers 503 when the database is down", async () => {
    const controller = await createController({ database: { status: "down" } });

    await expect(controller.readiness()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
