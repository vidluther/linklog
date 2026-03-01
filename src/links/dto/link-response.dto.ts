import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LinkResponseDto {
  @ApiProperty({ example: 42, description: "Unique identifier for the link" })
  id!: number;

  @ApiProperty({
    example: "https://example.com/interesting-article",
    description: "URL of the bookmarked link",
  })
  url!: string;

  @ApiPropertyOptional({
    example: "An Interesting Article",
    description: "Title of the link",
    nullable: true,
  })
  title!: string | null;

  @ApiPropertyOptional({
    example: "A brief summary of why this link is worth saving",
    description: "Summary or description of the link",
    nullable: true,
  })
  summary!: string | null;

  @ApiProperty({
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    description: "UUID of the user who owns this link",
  })
  user_id!: string;

  @ApiProperty({
    example: "2026-03-01T12:00:00.000Z",
    description: "Timestamp when the link was created",
  })
  created_at!: string;

  @ApiProperty({
    example: "2026-03-01T12:00:00.000Z",
    description: "Timestamp when the link was last updated",
  })
  updated_at!: string;
}
