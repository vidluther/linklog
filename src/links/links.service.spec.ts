import { Test, TestingModule } from "@nestjs/testing";
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { LinksService } from "./links.service";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";

const USER_ID = "user-uuid-1";

const mockLink = {
  id: 1,
  user_id: USER_ID,
  url: "https://example.com",
  title: "Example",
  summary: "A summary",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function createMockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return chain;
}

describe("LinksService", () => {
  let service: LinksService;
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    supabase = createMockSupabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should insert with user_id and return the new link", async () => {
      supabase.single.mockResolvedValue({ data: mockLink, error: null });

      const result = await service.create(
        { url: "https://example.com", title: "Example" },
        USER_ID,
      );

      expect(result).toEqual(mockLink);
      expect(supabase.from).toHaveBeenCalledWith("links");
      expect(supabase.insert).toHaveBeenCalledWith({
        url: "https://example.com",
        title: "Example",
        user_id: USER_ID,
      });
    });

    it("should throw InternalServerErrorException on supabase error", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      });

      await expect(
        service.create(
          { url: "https://example.com", title: "Example" },
          USER_ID,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("findAll", () => {
    it("should return links filtered by user_id ordered by created_at desc", async () => {
      const mockLinks = [mockLink];
      supabase.order.mockResolvedValue({ data: mockLinks, error: null });

      const result = await service.findAll(USER_ID);

      expect(result).toEqual(mockLinks);
      expect(supabase.from).toHaveBeenCalledWith("links");
      expect(supabase.select).toHaveBeenCalledWith("*");
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
      expect(supabase.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("should throw InternalServerErrorException on supabase error", async () => {
      supabase.order.mockResolvedValue({
        data: null,
        error: { message: "db error" },
      });

      await expect(service.findAll(USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("findOne", () => {
    it("should return a link by id scoped to user_id", async () => {
      supabase.single.mockResolvedValue({ data: mockLink, error: null });

      const result = await service.findOne(1, USER_ID);

      expect(result).toEqual(mockLink);
      expect(supabase.from).toHaveBeenCalledWith("links");
      expect(supabase.eq).toHaveBeenCalledWith("id", 1);
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });

    it("should throw NotFoundException when link does not exist", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(service.findOne(999, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(999, USER_ID)).rejects.toThrow(
        "Link #999 not found",
      );
    });

    it("should throw NotFoundException when link belongs to a different user", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(service.findOne(1, "other-user-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw InternalServerErrorException on generic supabase error", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "unexpected" },
      });

      await expect(service.findOne(1, USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("update", () => {
    it("should update and return the link scoped to user_id", async () => {
      const updated = { ...mockLink, title: "Updated" };
      supabase.single.mockResolvedValue({ data: updated, error: null });

      const result = await service.update(1, { title: "Updated" }, USER_ID);

      expect(result).toEqual(updated);
      expect(supabase.from).toHaveBeenCalledWith("links");
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated",
          updated_at: expect.any(String),
        }),
      );
      expect(supabase.eq).toHaveBeenCalledWith("id", 1);
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });

    it("should throw NotFoundException when link does not exist or belongs to another user", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(
        service.update(999, { title: "Nope" }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw InternalServerErrorException on generic supabase error", async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "unexpected" },
      });

      await expect(
        service.update(1, { title: "Fail" }, USER_ID),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("remove", () => {
    it("should delete the link scoped to user_id", async () => {
      supabase.single.mockResolvedValue({ error: null });

      const result = await service.remove(1, USER_ID);

      expect(result).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith("links");
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("id", 1);
      expect(supabase.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });

    it("should throw NotFoundException when link does not exist or belongs to another user", async () => {
      supabase.single.mockResolvedValue({
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(service.remove(999, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw InternalServerErrorException on generic supabase error", async () => {
      supabase.single.mockResolvedValue({
        error: { code: "OTHER", message: "unexpected" },
      });

      await expect(service.remove(1, USER_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
