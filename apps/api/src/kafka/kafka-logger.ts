import type { KafkaJS } from "@confluentinc/kafka-javascript";
import type { Logger } from "@nestjs/common";

export function createKafkaLogger(logger: Logger): KafkaJS.Logger {
  const kafkaLogger: KafkaJS.Logger = {
    info: () => undefined,
    debug: () => undefined,
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
    namespace: () => kafkaLogger,
    setLogLevel: () => undefined,
  };
  return kafkaLogger;
}
