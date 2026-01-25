import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly _healthService: HealthService) {}

  @Get()
  getHealth() {
    return this._healthService.getHealth();
  }
}
