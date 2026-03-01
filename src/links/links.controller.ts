import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { LinksService } from './links.service';
import { UsersService } from '../users/users.service.js';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator.js';

interface AuthUser {
  userId: string;
  username: string;
}

@ApiTags('Links')
@ApiParam({ name: 'username', description: 'The username of the link owner' })
@ApiSecurity('api-key')
@Controller(':username/links')
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() createLinkDto: CreateLinkDto, @CurrentUser() user: AuthUser) {
    return this.linksService.create(createLinkDto, user.userId);
  }

  @Public()
  @Get()
  async findAll(@Param('username') username: string) {
    const profile = await this.usersService.findByUsername(username);
    return this.linksService.findAll(profile.id);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('username') username: string, @Param('id') id: string) {
    const profile = await this.usersService.findByUsername(username);
    return this.linksService.findOne(+id, profile.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLinkDto: UpdateLinkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.linksService.update(+id, updateLinkDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.linksService.remove(+id, user.userId);
  }
}
