import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthModule } from "./health/health.module.js";
import { DebugModule } from "./debug/debug.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    DebugModule,
  ],
})
export class AppModule {}
