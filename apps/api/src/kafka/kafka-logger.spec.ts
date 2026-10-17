import { Logger } from "@nestjs/common";
import { createKafkaLogger } from "./kafka-logger.js";

describe("createKafkaLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["warn", "warn"],
    ["error", "error"],
  ] as const)(
    "passes the client's %s messages to Nest's %s",
    (clientLevel, nestLevel) => {
      const logger = new Logger("KafkaClient");
      const nestMethod = vi
        .spyOn(logger, nestLevel)
        .mockImplementation(() => undefined);

      createKafkaLogger(logger)[clientLevel]("broker is slow");

      expect(nestMethod).toHaveBeenCalledWith("broker is slow");
    },
  );

  it("drops the client's info and debug messages", () => {
    const logger = new Logger("KafkaClient");
    const nestLog = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    const nestDebug = vi
      .spyOn(logger, "debug")
      .mockImplementation(() => undefined);
    const kafkaLogger = createKafkaLogger(logger);

    kafkaLogger.info("Producer connected");
    kafkaLogger.debug("sending a batch");

    expect(nestLog).not.toHaveBeenCalled();
    expect(nestDebug).not.toHaveBeenCalled();
  });
});
