import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get("healthz")
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get("readyz")
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck("database", this.prisma, { timeout: 1500 }),
    ]);
  }
}
