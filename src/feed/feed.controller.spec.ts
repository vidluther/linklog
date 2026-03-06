import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { UsersService, UserProfile } from "../users/users.service.js";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const USER_ID = "user-uuid-1";
const HANDLE = "alice";

const mockUser: UserProfile = { id: USER_ID, handle: HANDLE };

describe("FeedController", () => {
  let controller: FeedController;
  let feedService: FeedService;
  let usersService: UsersService;

  beforeEach(() => {
    feedService = {
      generateRssFeed: vi.fn().mockResolvedValue("<rss/>"),
    } as unknown as FeedService;

    usersService = {
      findByHandle: vi.fn().mockResolvedValue(mockUser),
    } as unknown as UsersService;

    controller = new FeedController(feedService, usersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getFeed", () => {
    it("should resolve handle and delegate to FeedService.generateRssFeed", async () => {
      const result = await controller.getFeed(HANDLE);

      expect(usersService.findByHandle).toHaveBeenCalledWith(HANDLE);
      expect(feedService.generateRssFeed).toHaveBeenCalledWith(USER_ID, HANDLE);
      expect(result).toBe("<rss/>");
    });
  });

  describe("@Public() decorator", () => {
    it("should mark getFeed as public", () => {
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, controller.getFeed);
      expect(metadata).toBe(true);
    });
  });
});
