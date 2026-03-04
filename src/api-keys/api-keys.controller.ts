import { Controller, Get, Post, Delete, Body, Param } from "@nestjs/common";
import { ApiParam, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiKeysService } from "./api-keys.service.js";
import { CreateApiKeyDto } from "./dto/create-api-key.dto.js";
import { CurrentUser } from "../auth/current-user.decorator.js";

interface AuthUser {
  userId: string;
  handle: string;
}

@ApiTags("API Keys")
@ApiParam({
  name: "handle",
  description: "The handle of the API key owner",
})
@ApiSecurity("api-key")
@Controller(":handle/api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.apiKeysService.findAll(user.userId);
  }

  @Post()
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: AuthUser) {
    return this.apiKeysService.create(dto, user.userId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.apiKeysService.remove(id, user.userId);
  }
}
