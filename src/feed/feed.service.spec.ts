import { ConfigService } from "@nestjs/config";
import { LinksService } from "../links/links.service";
import { FeedService } from "./feed.service";

const USER_ID = "user-uuid-1";
const HANDLE = "alice";

const mockLink = {
  id: 1,
  user_id: USER_ID,
  url: "https://example.com",
  title: "Example Link",
  summary: "A summary",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("FeedService", () => {
  let service: FeedService;
  let linksService: LinksService;

  beforeEach(() => {
    linksService = {
      findAll: vi.fn().mockResolvedValue([mockLink]),
    } as unknown as LinksService;

    const configService = {
      get: vi.fn().mockReturnValue("http://localhost:3000"),
    } as unknown as ConfigService;

    service = new FeedService(linksService, configService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateRssFeed", () => {
    it("should call linksService.findAll with the given userId", async () => {
      await service.generateRssFeed(USER_ID, HANDLE);

      expect(linksService.findAll).toHaveBeenCalledWith(USER_ID);
    });

    it("should return a string of RSS XML", async () => {
      const result = await service.generateRssFeed(USER_ID, HANDLE);

      expect(typeof result).toBe("string");
      expect(result).toContain("<rss");
      expect(result).toContain("<channel>");
    });

    it("should include the handle in the feed title", async () => {
      const result = await service.generateRssFeed(USER_ID, HANDLE);

      expect(result).toContain(HANDLE);
    });

    it("should include link items in the feed", async () => {
      const result = await service.generateRssFeed(USER_ID, HANDLE);

      expect(result).toContain("https://example.com");
    });

    it("should return a valid feed with no items when links list is empty", async () => {
      vi.mocked(linksService.findAll).mockResolvedValue([]);

      const result = await service.generateRssFeed(USER_ID, HANDLE);

      expect(result).toContain("<channel>");
    });
  });
});
