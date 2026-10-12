import { ConsoleLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.useLogger(
    new ConsoleLogger({
      json: config.get("LOG_FORMAT", { infer: true }) === "json",
    }),
  );
  app.setGlobalPrefix("api/v1", { exclude: ["healthz", "readyz"] });

  const openapi = new DocumentBuilder()
    .setTitle("Harbormaster API")
    .setVersion("0.1.0")
    .setOpenAPIVersion("3.1.0")
    .build();

  SwaggerModule.setup(
    "docs",
    app,
    () => SwaggerModule.createDocument(app, openapi),
    { useGlobalPrefix: true, jsonDocumentUrl: "openapi.json" },
  );

  app.enableShutdownHooks();
  await app.listen(
    config.get("PORT", { infer: true }),
    config.get("HOST", { infer: true }),
  );
}
await bootstrap();
