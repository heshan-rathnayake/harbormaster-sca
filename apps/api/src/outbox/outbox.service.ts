import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";

const SOURCE = "/harbormaster/api";

export interface OutboxEvent {
  topic: string;
  key: string;
  type: string;
  data: Prisma.InputJsonValue;
}

@Injectable()
export class OutboxService {
  async add(tx: Prisma.TransactionClient, event: OutboxEvent): Promise<string> {
    const id = randomUUID();
    await tx.outbox.create({
      data: {
        topic: event.topic,
        key: event.key,
        payload: event.data,
        headers: {
          ce_specversion: "1.0",
          ce_id: id,
          ce_source: SOURCE,
          ce_type: event.type,
          ce_time: new Date().toISOString(),
          "content-type": "application/json",
        },
      },
      select: { id: true },
    });
    return id;
  }
}
