import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const USER_ID = "user-uuid-1";
const HANDLE = "alice";

const mockApiKey = {
  id: "key-uuid-1",
  name: "My Key",
  created_at: "2026-01-01T00:00:00.000Z",
  last_used_at: null,
};

describe("ApiKeysController", () => {
  let controller: ApiKeysController;
  let service: ApiKeysService;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    } as unknown as ApiKeysService;

    controller = new ApiKeysController(service);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should delegate to ApiKeysService.findAll with userId from CurrentUser", async () => {
      vi.mocked(service.findAll).mockResolvedValue([mockApiKey]);

      const result = await controller.findAll({
        userId: USER_ID,
        handle: HANDLE,
      });

      expect(service.findAll).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual([mockApiKey]);
    });
  });

  describe("create", () => {
    it("should delegate to ApiKeysService.create and return result with rawKey", async () => {
      const created = { ...mockApiKey, rawKey: "lb_" + "a".repeat(64) };
      vi.mocked(service.create).mockResolvedValue(created);

      const dto = { name: "My Key" };
      const result = await controller.create(dto, {
        userId: USER_ID,
        handle: HANDLE,
      });

      expect(service.create).toHaveBeenCalledWith(dto, USER_ID);
      expect(result).toEqual(created);
    });
  });

  describe("remove", () => {
    it("should delegate to ApiKeysService.remove with id and userId from CurrentUser", async () => {
      vi.mocked(service.remove).mockResolvedValue(undefined);

      const result = await controller.remove("key-uuid-1", {
        userId: USER_ID,
        handle: HANDLE,
      });

      expect(service.remove).toHaveBeenCalledWith("key-uuid-1", USER_ID);
      expect(result).toBeUndefined();
    });
  });

  describe("@Public() decorator", () => {
    it("should NOT mark findAll as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.findAll);
      expect(metadata).toBeUndefined();
    });

    it("should NOT mark create as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.create);
      expect(metadata).toBeUndefined();
    });

    it("should NOT mark remove as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.remove);
      expect(metadata).toBeUndefined();
    });
  });
});
