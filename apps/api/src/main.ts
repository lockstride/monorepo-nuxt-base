import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";
import { configureApp } from "./app/bootstrap";

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port");

  configureApp(app);

  await app.listen(port as number, "0.0.0.0");
  const address = app.getHttpServer().address();
  const host =
    typeof address === "object" && address && address.address
      ? address.address === "::" || address.address === "0.0.0.0"
        ? "all interfaces"
        : address.address
      : "unknown";
  /* v8 ignore next */
  console.log(`API server listening on ${host}:${port}`);
}

bootstrap();
