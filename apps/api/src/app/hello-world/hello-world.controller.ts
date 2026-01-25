import { Controller, Get } from "@nestjs/common";
import { HelloWorldService } from "./hello-world.service";

@Controller("hello-world")
export class HelloWorldController {
  constructor(private readonly _helloWorldService: HelloWorldService) {}

  @Get()
  getMessage() {
    return this._helloWorldService.getMessage();
  }
}
