import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class HealthService {
  constructor(private _prisma: PrismaService) {}

  async getHealth() {
    try {
      // Test database connection
      await this._prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          database: "healthy",
          api: "healthy",
        },
      };
    } catch (error) {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        services: {
          database: "unhealthy",
          api: "healthy",
        },
        error: error.message,
      };
    }
  }
}
