import { Controller, Get, Header, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { FeedService } from "./feed.service";
import { UsersService } from "../users/users.service.js";
import { Public } from "../auth/public.decorator";

const RSS_EXAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>jdoe's Linkblog</title>
    <link>https://api.linkblog.in/jdoe/feed</link>
    <description>Things that I found interesting</description>
    <language>en</language>
    <generator>Linkblog</generator>
    <item>
      <title>An Interesting Article</title>
      <link>https://example.com/interesting-article</link>
      <description>A brief summary of why this link is worth saving</description>
      <pubDate>Sat, 01 Mar 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

@ApiTags("Feed")
@ApiParam({
  name: "handle",
  description: "The handle whose feed to retrieve",
})
@Controller(":handle/feed")
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Get()
  @Header("Content-Type", "application/rss+xml")
  @ApiProduces("application/rss+xml")
  @ApiOkResponse({
    description: "RSS 2.0 feed of the user's links",
    content: {
      "application/rss+xml": {
        schema: { type: "string" },
        example: RSS_EXAMPLE,
      },
    },
  })
  @ApiNotFoundResponse({ description: "User not found" })
  async getFeed(@Param("handle") handle: string): Promise<string> {
    const profile = await this.usersService.findByHandle(handle);
    return this.feedService.generateRssFeed(profile.id, handle);
  }
}
