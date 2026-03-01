import { LinksController } from "./links.controller";
import { LinksService } from "./links.service";
import { UsersService, UserProfile } from "../users/users.service.js";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const USER_ID = "user-uuid-1";
const USERNAME = "alice";

const mockUser: UserProfile = { id: USER_ID, username: USERNAME };

const mockLink = {
  id: 1,
  user_id: USER_ID,
  url: "https://example.com",
  title: "Example",
  summary: "A summary",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("LinksController", () => {
  let controller: LinksController;
  let linksService: LinksService;
  let usersService: UsersService;

  beforeEach(() => {
    linksService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as LinksService;

    usersService = {
      findByUsername: vi.fn().mockResolvedValue(mockUser),
    } as unknown as UsersService;

    controller = new LinksController(linksService, usersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should delegate to LinksService.create with userId from CurrentUser", async () => {
      vi.mocked(linksService.create).mockResolvedValue(mockLink);

      const dto = { url: "https://example.com", title: "Example" };
      const result = await controller.create(dto, {
        userId: USER_ID,
        username: USERNAME,
      });

      expect(result).toEqual(mockLink);
      expect(linksService.create).toHaveBeenCalledWith(dto, USER_ID);
    });
  });

  describe("findAll", () => {
    it("should resolve username to userId and delegate to LinksService.findAll", async () => {
      vi.mocked(linksService.findAll).mockResolvedValue([mockLink]);

      const result = await controller.findAll(USERNAME);

      expect(usersService.findByUsername).toHaveBeenCalledWith(USERNAME);
      expect(linksService.findAll).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual([mockLink]);
    });
  });

  describe("findOne", () => {
    it("should resolve username to userId and delegate to LinksService.findOne", async () => {
      vi.mocked(linksService.findOne).mockResolvedValue(mockLink);

      const result = await controller.findOne(USERNAME, "1");

      expect(usersService.findByUsername).toHaveBeenCalledWith(USERNAME);
      expect(linksService.findOne).toHaveBeenCalledWith(1, USER_ID);
      expect(result).toEqual(mockLink);
    });
  });

  describe("update", () => {
    it("should delegate to LinksService.update with userId from CurrentUser", async () => {
      const updated = { ...mockLink, title: "Updated" };
      vi.mocked(linksService.update).mockResolvedValue(updated);

      const dto = { title: "Updated" };
      const result = await controller.update("1", dto, {
        userId: USER_ID,
        username: USERNAME,
      });

      expect(linksService.update).toHaveBeenCalledWith(1, dto, USER_ID);
      expect(result).toEqual(updated);
    });
  });

  describe("remove", () => {
    it("should delegate to LinksService.remove with userId from CurrentUser", async () => {
      vi.mocked(linksService.remove).mockResolvedValue(undefined);

      const result = await controller.remove("1", {
        userId: USER_ID,
        username: USERNAME,
      });

      expect(linksService.remove).toHaveBeenCalledWith(1, USER_ID);
      expect(result).toBeUndefined();
    });
  });

  describe("@Public() decorator", () => {
    it("should mark findAll as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.findAll);
      expect(metadata).toBe(true);
    });

    it("should mark findOne as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.findOne);
      expect(metadata).toBe(true);
    });

    it("should NOT mark create as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.create);
      expect(metadata).toBeUndefined();
    });

    it("should NOT mark update as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.update);
      expect(metadata).toBeUndefined();
    });

    it("should NOT mark remove as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.remove);
      expect(metadata).toBeUndefined();
    });
  });
});
