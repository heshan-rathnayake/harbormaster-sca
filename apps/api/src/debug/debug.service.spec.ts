import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { OutboxService } from "../outbox/outbox.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DebugService, PING_TOPIC } from "./debug.service.js";

async function createService(debugEndpoints = true) {
  const tx = { name: "fake transaction" };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
    ),
  };
  const outbox = { add: vi.fn(async () => "event-1") };
  const config = { get: vi.fn(() => debugEndpoints) };

  const moduleRef = await Test.createTestingModule({
    providers: [
      DebugService,
      { provide: PrismaService, useValue: prisma },
      { provide: OutboxService, useValue: outbox },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();

  return { service: moduleRef.get(DebugService), tx, outbox };
}

describe("DebugService", () => {
  it("writes one ping event to the outbox, inside a transaction", async () => {
    const { service, tx, outbox } = await createService();

    await service.ping();

    expect(outbox.add).toHaveBeenCalledOnce();
    expect(outbox.add).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        topic: PING_TOPIC,
        type: "dev.harbormaster.debug.ping.v1",
      }),
    );
  });

  it("returns the id of the event it wrote", async () => {
    const { service } = await createService();

    const result = await service.ping();

    expect(result).toEqual({ eventId: "event-1" });
  });

  it("is not available unless debug endpoints are switched on", async () => {
    const { service, outbox } = await createService(false);

    await expect(service.ping()).rejects.toThrow(NotFoundException);
    expect(outbox.add).not.toHaveBeenCalled();
  });
});
