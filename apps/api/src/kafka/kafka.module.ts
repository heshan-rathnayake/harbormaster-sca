import { KafkaJS } from "@confluentinc/kafka-javascript";
import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RelayEnv } from "../config/env.js";
import { KAFKA_PRODUCER, KafkaService } from "./kafka.service.js";
import { createKafkaLogger } from "./kafka-logger.js";

@Module({
  providers: [
    {
      provide: KAFKA_PRODUCER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<RelayEnv, true>) =>
        new KafkaJS.Kafka({
          kafkaJS: {
            clientId: "hm-relay",
            brokers: config.get("KAFKA_BROKERS", { infer: true }),
            logger: createKafkaLogger(new Logger("KafkaClient")),
          },
        }).producer({ kafkaJS: { idempotent: true } }),
    },
    KafkaService,
  ],
  exports: [KafkaService],
})
export class KafkaModule {}
