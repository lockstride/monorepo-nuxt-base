import { Module } from "@nestjs/common";
import { HelloWorldController } from "./hello-world.controller";
import { HelloWorldService } from "./hello-world.service";
import { PrismaService } from "../../prisma.service";

@Module({
  controllers: [HelloWorldController],
  providers: [HelloWorldService, PrismaService],
})
export class HelloWorldModule {}
