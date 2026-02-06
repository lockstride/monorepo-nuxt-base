import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class HelloWorldService {
  constructor(private _prisma: PrismaService) {}

  async getMessage() {
    const msg = await this._prisma.helloWorldMessage.findFirst();
    return msg || { message: "No message found in database." };
  }
}
