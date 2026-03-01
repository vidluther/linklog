import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { UsersService, UserProfile } from "../users/users.service.js";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const USER_ID = "user-uuid-1";
const USERNAME = "alice";

const mockUser: UserProfile = { id: USER_ID, username: USERNAME };

describe("FeedController", () => {
  let controller: FeedController;
  let feedService: FeedService;
  let usersService: UsersService;

  beforeEach(() => {
    feedService = {
      generateRssFeed: vi.fn().mockResolvedValue("<rss/>"),
    } as unknown as FeedService;

    usersService = {
      findByUsername: vi.fn().mockResolvedValue(mockUser),
    } as unknown as UsersService;

    controller = new FeedController(feedService, usersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getFeed", () => {
    it("should resolve username and delegate to FeedService.generateRssFeed", async () => {
      const result = await controller.getFeed(USERNAME);

      expect(usersService.findByUsername).toHaveBeenCalledWith(USERNAME);
      expect(feedService.generateRssFeed).toHaveBeenCalledWith(
        USER_ID,
        USERNAME,
      );
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
