import { Injectable, Logger } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service.js";
import { withTimeout } from "../common/with-timeout.js";

const TIMEOUT_MS = 1500;

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isReachable(key = "database"): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        TIMEOUT_MS,
        `No answer within ${TIMEOUT_MS} ms`,
      );
      return indicator.up();
    } catch (error) {
      // The cause goes to the logs only: this endpoint needs no login, so its
      // response must not reveal hosts, ports or driver details.
      this.logger.error(
        "Database health check failed",
        error instanceof Error ? error.stack : String(error),
      );
      return indicator.down();
    }
  }
}
