import {
  PrismaClient,
  createPrismaAdapter,
} from "@oxford-heavy/data-sources-prisma";
import { Injectable, OnModuleInit } from "@nestjs/common";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // createPrismaAdapter() resolves DATABASE_URL automatically
    super({ adapter: createPrismaAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
