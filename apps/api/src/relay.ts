import { ConsoleLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { RelayEnv } from "./config/env.js";
import { RelayModule } from "./relay/relay.module.js";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(RelayModule, {
    bufferLogs: true,
  });
  const config = app.get<ConfigService<RelayEnv, true>>(ConfigService);
  app.useLogger(
    new ConsoleLogger({
      json: config.get("LOG_FORMAT", { infer: true }) === "json",
    }),
  );
  app.enableShutdownHooks();
}
await bootstrap();
