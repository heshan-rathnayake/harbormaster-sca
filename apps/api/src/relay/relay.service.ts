import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { KafkaService } from "../kafka/kafka.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 500;
const RETRY_DELAY_MS = 5_000;
// Longer than the producer's 10 s message timeout, so a stuck send fails
// inside the transaction instead of outliving it.
const TRANSACTION_TIMEOUT_MS = 15_000;

interface OutboxRow {
  id: bigint;
  topic: string;
  key: string;
  payload: Prisma.JsonValue;
  headers: Record<string, string>;
}

@Injectable()
export class RelayService implements OnModuleDestroy {
  private readonly logger = new Logger(RelayService.name);
  private running = false;
  private timer: NodeJS.Timeout | undefined;
  private currentRun: Promise<void> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  async start(): Promise<void> {
    await this.kafka.connect();
    this.running = true;
    this.scheduleNext(0);
    this.logger.log("Relay started");
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    clearTimeout(this.timer);
    await this.currentRun;
    this.logger.log("Relay stopped");
  }

  async publishBatch(): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, topic, key, payload, headers
          FROM outbox
          WHERE published_at IS NULL
          ORDER BY id
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        `;
        for (const row of rows) {
          await this.kafka.publish({
            topic: row.topic,
            key: row.key,
            value: JSON.stringify(row.payload),
            headers: row.headers,
          });
        }
        if (rows.length > 0) {
          await tx.outbox.updateMany({
            where: { id: { in: rows.map((row) => row.id) } },
            data: { publishedAt: new Date() },
          });
        }
        return rows.length;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }

  private scheduleNext(delayMs: number): void {
    this.timer = setTimeout(() => {
      this.currentRun = this.runOnce();
    }, delayMs);
  }

  private async runOnce(): Promise<void> {
    let delayMs = POLL_INTERVAL_MS;
    try {
      const published = await this.publishBatch();
      if (published > 0) {
        this.logger.log(`Published ${published} event(s)`);
      }
      if (published === BATCH_SIZE) {
        delayMs = 0;
      }
    } catch (error) {
      this.logger.error(
        `Publishing failed; retrying in ${RETRY_DELAY_MS / 1000} s`,
        error instanceof Error ? error.stack : String(error),
      );
      delayMs = RETRY_DELAY_MS;
    }
    if (this.running) {
      this.scheduleNext(delayMs);
    }
  }
}
