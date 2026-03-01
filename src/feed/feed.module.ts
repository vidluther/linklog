import { Module } from "@nestjs/common";
import { LinksModule } from "../links/links.module";
import { UsersModule } from "../users/users.module.js";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

@Module({
  imports: [LinksModule, UsersModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
