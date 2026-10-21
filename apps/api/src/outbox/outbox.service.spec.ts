import type { Prisma } from "../generated/prisma/client.js";
import { OutboxService } from "./outbox.service.js";

const event = {
  topic: "harbormaster.debug.ping.v1",
  key: "ping",
  type: "dev.harbormaster.debug.ping.v1",
  data: { message: "hello" },
};

function createFakeTx() {
  const create = vi.fn(async () => ({ id: 1n }));
  const tx = { outbox: { create } } as unknown as Prisma.TransactionClient;
  return { tx, create };
}

describe("OutboxService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves the event's topic, key and payload", async () => {
    const { tx, create } = createFakeTx();

    await new OutboxService().add(tx, event);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "harbormaster.debug.ping.v1",
          key: "ping",
          payload: { message: "hello" },
        }),
      }),
    );
  });

  it("adds the CloudEvent headers with the id it returns", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T00:00:00.000Z"));
    const { tx, create } = createFakeTx();

    const id = await new OutboxService().add(tx, event);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          headers: {
            ce_specversion: "1.0",
            ce_id: id,
            ce_source: "/harbormaster/api",
            ce_type: "dev.harbormaster.debug.ping.v1",
            ce_time: "2026-10-14T00:00:00.000Z",
            "content-type": "application/json",
          },
        }),
      }),
    );
    expect(typeof id).toBe("string");
  });

  it("gives every event its own id", async () => {
    const { tx } = createFakeTx();
    const service = new OutboxService();

    const first = await service.add(tx, event);
    const second = await service.add(tx, event);

    expect(first).not.toBe(second);
  });
});
