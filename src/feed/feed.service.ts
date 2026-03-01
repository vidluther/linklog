import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LinksService } from "../links/links.service";

@Injectable()
export class FeedService {
  constructor(
    private readonly linksService: LinksService,
    private readonly configService: ConfigService,
  ) {}

  async generateRssFeed(userId: string, username: string): Promise<string> {
    const { Feed } = await import("feed");
    const links = await this.linksService.findAll(userId);

    const appUrl = this.configService.get<string>(
      "API_URL",
      "https://api.linkblog.in",
    );
    const feedUrl = `${appUrl}/${username}/feed`;

    const feed = new Feed({
      title: `${username}'s Linkblog`,
      description: "Things that I found interesting",
      id: feedUrl,
      link: feedUrl,
      language: "en",
      generator: "Linkblog",
      copyright: "",
    });

    for (const link of links ?? []) {
      feed.addItem({
        title: link.title,
        id: link.url,
        link: link.url,
        description: link.summary ?? "",
        date: new Date(link.created_at),
      });
    }

    return feed.rss2();
  }
}
