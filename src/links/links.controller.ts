import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { LinksService } from "./links.service";
import { UsersService } from "../users/users.service.js";
import { CreateLinkDto } from "./dto/create-link.dto";
import { UpdateLinkDto } from "./dto/update-link.dto";
import { LinkResponseDto } from "./dto/link-response.dto";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator.js";

interface AuthUser {
  userId: string;
  handle: string;
}

@ApiTags("Links")
@ApiParam({ name: "handle", description: "The handle of the link owner" })
@ApiSecurity("api-key")
@Controller(":handle/links")
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description: "The link has been created",
    type: LinkResponseDto,
  })
  create(@Body() createLinkDto: CreateLinkDto, @CurrentUser() user: AuthUser) {
    return this.linksService.create(createLinkDto, user.userId);
  }

  @Public()
  @Get()
  @ApiOkResponse({
    description: "List of all links for the user",
    type: [LinkResponseDto],
  })
  async findAll(@Param("handle") handle: string) {
    const profile = await this.usersService.findByHandle(handle);
    return this.linksService.findAll(profile.id);
  }

  @Public()
  @Get(":id")
  @ApiOkResponse({
    description: "The requested link",
    type: LinkResponseDto,
  })
  @ApiNotFoundResponse({ description: "Link not found" })
  async findOne(@Param("handle") handle: string, @Param("id") id: string) {
    const profile = await this.usersService.findByHandle(handle);
    return this.linksService.findOne(+id, profile.id);
  }

  @Patch(":id")
  @ApiOkResponse({
    description: "The updated link",
    type: LinkResponseDto,
  })
  @ApiNotFoundResponse({ description: "Link not found" })
  update(
    @Param("id") id: string,
    @Body() updateLinkDto: UpdateLinkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.linksService.update(+id, updateLinkDto, user.userId);
  }

  @Delete(":id")
  @ApiNoContentResponse({ description: "The link has been deleted" })
  @ApiNotFoundResponse({ description: "Link not found" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.linksService.remove(+id, user.userId);
  }
}
