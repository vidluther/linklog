import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { UsersService } from '../users/users.service.js';
import { Public } from '../auth/public.decorator';

@ApiTags('Feed')
@ApiParam({
  name: 'username',
  description: 'The username whose feed to retrieve',
})
@Controller(':username/feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Get()
  @Header('Content-Type', 'application/rss+xml')
  async getFeed(@Param('username') username: string): Promise<string> {
    const profile = await this.usersService.findByUsername(username);
    return this.feedService.generateRssFeed(profile.id, username);
  }
}
