import type { KafkaJS } from "@confluentinc/kafka-javascript";
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from "@nestjs/common";
import { withTimeout } from "../common/with-timeout.js";

export const KAFKA_PRODUCER = "KAFKA_PRODUCER";
const CONNECT_TIMEOUT_MS = 10_000;

export interface KafkaMessage {
  topic: string;
  key: string;
  value: string;
  headers: Record<string, string>;
}

@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: KafkaJS.Producer,
  ) {}

  async connect(): Promise<void> {
    await withTimeout(
      this.producer.connect(),
      CONNECT_TIMEOUT_MS,
      `Could not connect to the broker within ${CONNECT_TIMEOUT_MS / 1000} s. Is it running, and is KAFKA_BROKERS right?`,
    );
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
