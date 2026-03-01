import { Test, TestingModule } from "@nestjs/testing";
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";

const mockProfile = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  username: "vid",
};

function createMockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return chain;
}

describe("UsersService", () => {
  let service: UsersService;
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    supabase = createMockSupabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByUsername", () => {
    it("should return the user profile for a known username", async () => {
      supabase.single.mockResolvedValue({ data: mockProfile, error: null });

      const result = await service.findByUsername("vid");

      expect(result).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(supabase.select).toHaveBeenCalledWith("id, username");
      expect(supabase.eq).toHaveBeenCalledWith("username", "vid");
    });

    it("should throw NotFoundException for an unknown username", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(service.findByUsername("nobody")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByUsername("nobody")).rejects.toThrow(
        "User 'nobody' not found",
      );
    });

    it("should throw InternalServerErrorException on other DB errors", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "unexpected db error" },
      });

      await expect(service.findByUsername("vid")).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
