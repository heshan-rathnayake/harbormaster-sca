import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";
import { DatabaseHealthIndicator } from "./database.health.js";

@ApiTags()
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get("healthz")
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get("readyz")
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.database.isReachable()]);
  }
}
