import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { KAFKA_PRODUCER, KafkaService } from "./kafka.service.js";

async function createModule() {
  const producer = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    send: vi.fn(async () => []),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      KafkaService,
      {
        provide: KAFKA_PRODUCER,
        useValue: producer,
      },
    ],
  }).compile();

  return {
    moduleRef,
    service: moduleRef.get(KafkaService),
    producer,
  };
}

describe("KafkaService", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("connects to the broker when the app starts", async () => {
    const { service, producer } = await createModule();

    await service.connect();

    expect(producer.connect).toHaveBeenCalledOnce();
  });

  it("disconnects from the broker when the app shuts down", async () => {
    const { moduleRef, producer } = await createModule();

    await moduleRef.close();

    expect(producer.disconnect).toHaveBeenCalledOnce();
  });

  it("publishes a message with its topic, key, value and headers", async () => {
    const { service, producer } = await createModule();

    const message = {
      topic: "test-topic",
      key: "test-key",
      value: "test-value",
      headers: {
        "test-header": "test-header-value",
      },
    };

    await service.publish(message);

    expect(producer.send).toHaveBeenCalledOnce();
    expect(producer.send).toHaveBeenCalledWith({
      topic: message.topic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers: message.headers,
        },
      ],
    });
  });

  it("fails when the broker does not accept the message", async () => {
    const { service, producer } = await createModule();
    producer.send.mockRejectedValueOnce(new Error("broker unavailable"));

    await expect(
      service.publish({
        topic: "test-topic",
        key: "test-key",
        value: "test-value",
        headers: {},
      }),
    ).rejects.toThrow("broker unavailable");
  });

  it("gives up when the broker does not answer within 10 seconds", async () => {
    vi.useFakeTimers();
    const { service, producer } = await createModule();
    producer.connect.mockImplementation(() => new Promise(() => undefined));

    const connecting = expect(service.connect()).rejects.toThrow(
      /Could not connect to the broker within 10 s/,
    );
    await vi.advanceTimersByTimeAsync(10_000);

    await connecting;
  });
});
