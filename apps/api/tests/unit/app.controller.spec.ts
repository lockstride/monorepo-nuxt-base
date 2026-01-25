import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "../../src/app/app.controller";
import { AppService } from "../../src/app/app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    appController = moduleFixture.get<AppController>(AppController);
  });

  describe("when getting data", () => {
    it("should return Hello API message", () => {
      // Given
      if (!appController) {
        throw new Error("AppController was not initialized. Check DI setup.");
      }
      // When
      const result = appController.getData();
      // Then
      expect(result).toEqual({ message: "Hello API" });
    });
  });
});
