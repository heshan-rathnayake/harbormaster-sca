import { Module } from "@nestjs/common";
import { DebugController } from "./debug.controller.js";
import { DebugService } from "./debug.service.js";
import { OutboxModule } from "../outbox/outbox.module.js";

@Module({
  imports: [OutboxModule],
  controllers: [DebugController],
  providers: [DebugService],
})
export class DebugModule {}
