import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { KafkaService } from "../kafka/kafka.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RelayService } from "./relay.service.js";

const rows = [
  {
    id: 1n,
    topic: "harbormaster.debug.ping.v1",
    key: "ping",
    payload: { message: "first" },
    headers: { ce_id: "event-1" },
  },
  {
    id: 2n,
    topic: "harbormaster.debug.ping.v1",
    key: "ping",
    payload: { message: "second" },
    headers: { ce_id: "event-2" },
  },
];

async function createService(claimed: typeof rows = rows) {
  const tx = {
    $queryRaw: vi.fn(async () => claimed),
    outbox: { updateMany: vi.fn(async () => ({ count: claimed.length })) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
    ),
  };
  const kafka = {
    connect: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      RelayService,
      { provide: PrismaService, useValue: prisma },
      { provide: KafkaService, useValue: kafka },
    ],
  }).compile();

  // Makes the next claim query wait until the returned function is called,
  // so a test can act while a batch is still running.
  function holdNextQuery(): () => void {
    let release: () => void = () => undefined;
    tx.$queryRaw.mockImplementationOnce(
      () =>
        new Promise<typeof rows>((resolve) => {
          release = () => resolve([]);
        }),
    );
    return () => release();
  }

  return { service: moduleRef.get(RelayService), tx, kafka, holdNextQuery };
}

describe("RelayService", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("publishes each claimed row as a message, in order", async () => {
    const { service, kafka } = await createService();

    await service.publishBatch();

    expect(kafka.publish).toHaveBeenNthCalledWith(1, {
      topic: "harbormaster.debug.ping.v1",
      key: "ping",
      value: '{"message":"first"}',
      headers: { ce_id: "event-1" },
    });
    expect(kafka.publish).toHaveBeenNthCalledWith(2, {
      topic: "harbormaster.debug.ping.v1",
      key: "ping",
      value: '{"message":"second"}',
      headers: { ce_id: "event-2" },
    });
  });

  it("waits for the current batch before stopping", async () => {
    vi.useFakeTimers();
    const { service, holdNextQuery } = await createService([]);
    const releaseQuery = holdNextQuery();
    await service.start();
    await vi.advanceTimersByTimeAsync(0);

    let stopped = false;
    const stopping = service.onModuleDestroy().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);

    releaseQuery();
    await stopping;
    expect(stopped).toBe(true);
  });

  it("marks the published rows as published", async () => {
    const { service, tx } = await createService();

    const published = await service.publishBatch();

    expect(published).toBe(2);
    expect(tx.outbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1n, 2n] } },
      data: { publishedAt: expect.any(Date) },
    });
  });

  it("does nothing when there is nothing to publish", async () => {
    const { service, tx, kafka } = await createService([]);

    const published = await service.publishBatch();

    expect(published).toBe(0);
    expect(kafka.publish).not.toHaveBeenCalled();
    expect(tx.outbox.updateMany).not.toHaveBeenCalled();
  });

  it("marks nothing when publishing fails", async () => {
    const { service, tx, kafka } = await createService();
    kafka.publish.mockRejectedValueOnce(new Error("broker unavailable"));

    await expect(service.publishBatch()).rejects.toThrow("broker unavailable");
    expect(kafka.publish).toHaveBeenCalledOnce();
    expect(tx.outbox.updateMany).not.toHaveBeenCalled();
  });

  it("tries again 5 seconds after a failed batch", async () => {
    vi.useFakeTimers();
    const { service, tx } = await createService([]);
    tx.$queryRaw.mockRejectedValueOnce(new Error("database unavailable"));

    await service.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);

    await service.onModuleDestroy();
  });

  it("starts no new batch once the app is shutting down", async () => {
    vi.useFakeTimers();
    const { service, tx, holdNextQuery } = await createService([]);
    const releaseQuery = holdNextQuery();
    await service.start();
    await vi.advanceTimersByTimeAsync(0);

    const stopping = service.onModuleDestroy();
    releaseQuery();
    await stopping;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
