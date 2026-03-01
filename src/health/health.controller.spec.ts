import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it('should return { status: "ok" }', () => {
      expect(controller.check()).toEqual({ status: "ok" });
    });

    it("should be marked @Public()", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.check);
      expect(metadata).toBe(true);
    });
  });
});
