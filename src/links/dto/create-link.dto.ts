import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class CreateLinkDto {
  @ApiProperty({
    example: "https://example.com/interesting-article",
    description: "URL of the link to bookmark",
  })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({
    example: "An Interesting Article",
    description: "Title of the link",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: "A brief summary of why this link is worth saving",
    description: "Summary or description of the link",
  })
  @IsOptional()
  @IsString()
  summary?: string;
}
