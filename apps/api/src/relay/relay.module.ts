import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateRelayEnv } from "../config/env.js";
import { KafkaModule } from "../kafka/kafka.module.js";
import { RelayService } from "./relay.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateRelayEnv }),
    PrismaModule,
    KafkaModule,
  ],
  providers: [RelayService],
})
export class RelayModule {}
