import { Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DebugService } from "./debug.service.js";

@ApiTags("Debug")
@Controller("debug")
export class DebugController {
  constructor(private readonly debug: DebugService) {}

  @Post("ping")
  @HttpCode(HttpStatus.ACCEPTED)
  ping() {
    return this.debug.ping();
  }
}
