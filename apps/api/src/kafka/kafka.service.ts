import type { KafkaJS } from "@confluentinc/kafka-javascript";
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

export const KAFKA_PRODUCER = "KAFKA_PRODUCER";

export interface KafkaMessage {
  topic: string;
  key: string;
  value: string;
  headers: Record<string, string>;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: KafkaJS.Producer,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log("Connected to the broker");
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log("Disconnected from the broker");
  }

  async publish(message: KafkaMessage): Promise<void> {
    await this.producer.send({
      topic: message.topic,
      messages: [
        { key: message.key, value: message.value, headers: message.headers },
      ],
    });
  }
}
