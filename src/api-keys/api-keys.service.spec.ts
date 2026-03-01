import { Test, TestingModule } from "@nestjs/testing";
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";

const USER_ID = "user-uuid-1";

const mockApiKey = {
  id: "key-uuid-1",
  user_id: USER_ID,
  name: "My Key",
  created_at: "2026-01-01T00:00:00.000Z",
  last_used_at: null,
};

function createMockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return chain;
}

describe("ApiKeysService", () => {
  let service: ApiKeysService;
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    supabase = createMockSupabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return api keys for a user (no key_hash field)", async () => {
      const keys = [mockApiKey];
      supabase.order.mockResolvedValue({ data: keys, error: null });

      const result = await service.findAll(USER_ID);

      expect(result).toEqual(keys);
      expect(supabase.from).toHaveBeenCalledWith("api_keys");
      expect(supabase.select).toHaveBeenCalledWith(
        "id, name, created_at, last_used_at",
      );
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });

    it("should throw InternalServerErrorException on DB error", async () => {
      supabase.order.mockResolvedValue({
        data: null,
        error: { message: "db error" },
      });

      await expect(service.findAll(USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("create", () => {
    it("should generate a key, store its hash, and return rawKey + row", async () => {
      supabase.single.mockResolvedValue({ data: mockApiKey, error: null });

      const result = await service.create({ name: "My Key" }, USER_ID);

      expect(result).toHaveProperty("rawKey");
      expect(result.rawKey).toMatch(/^lb_[0-9a-f]{64}$/);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name", "My Key");
      expect(supabase.from).toHaveBeenCalledWith("api_keys");
      expect(supabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          name: "My Key",
          key_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      );
    });

    it("should throw InternalServerErrorException on DB error", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      });

      await expect(service.create({ name: "My Key" }, USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("remove", () => {
    it("should delete the api key scoped to user_id", async () => {
      supabase.single.mockResolvedValue({ error: null });

      await service.remove("key-uuid-1", USER_ID);

      expect(supabase.from).toHaveBeenCalledWith("api_keys");
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", "key-uuid-1");
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });

    it("should throw NotFoundException when key does not exist or belongs to another user", async () => {
      supabase.single.mockResolvedValue({
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(service.remove("bad-id", USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw InternalServerErrorException on generic DB error", async () => {
      supabase.single.mockResolvedValue({
        error: { code: "OTHER", message: "unexpected" },
      });

      await expect(service.remove("key-uuid-1", USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
