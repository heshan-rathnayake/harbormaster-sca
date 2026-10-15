import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateRelayEnv } from "../config/env.js";
import { KafkaModule } from "../kafka/kafka.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateRelayEnv }),
    KafkaModule,
  ],
})
export class RelayModule {}
