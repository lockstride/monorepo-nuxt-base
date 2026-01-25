import { ConfigService } from "@nestjs/config";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function parseCorsOrigins(originsRaw?: string): string[] {
  if (!originsRaw) return [];
  return originsRaw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

export function configureApp(app: NestFastifyApplication): void {
  const configService = app.get(ConfigService);

  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Project API")
    .setDescription("API documentation for the project.")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const corsOriginsRaw = configService.get<string>("cors.origins");
  const origins = parseCorsOrigins(corsOriginsRaw);
  if (origins.length > 0) {
    app.enableCors({ origin: origins, credentials: true });
  }
}
