import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.js";
import { OutboxService } from "../outbox/outbox.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const PING_TOPIC = "harbormaster.debug.ping.v1";

@Injectable()
export class DebugService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async ping(): Promise<{ eventId: string }> {
    if (!this.config.get("DEBUG_ENDPOINTS", { infer: true })) {
      throw new NotFoundException();
    }

    const eventId = await this.prisma.$transaction((tx) =>
      this.outbox.add(tx, {
        topic: PING_TOPIC,
        key: "ping",
        type: "dev.harbormaster.debug.ping.v1",
        data: { message: "ping" },
      }),
    );
    return { eventId };
  }
}
