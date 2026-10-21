import { ConsoleLogger, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { RelayEnv } from "./config/env.js";
import { RelayModule } from "./relay/relay.module.js";
import { RelayService } from "./relay/relay.service.js";

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

  try {
    await app.get(RelayService).start();
  } catch (error) {
    new Logger("Relay").error(
      "The relay could not start",
      error instanceof Error ? error.stack : String(error),
    );
    await app.close();
    process.exitCode = 1;
  }
}
await bootstrap();
