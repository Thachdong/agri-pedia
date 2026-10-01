import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { MAX_REVIEW_PAGE_SIZE } from './list-distributor-reviews.query.dto';

export class ListProductReviewsQueryDto {
  /** Only reviews with this star, 1..5. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  star?: number;

  /** `nextCursor` from the previous page (same filters); omit for the first page. */
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cursor?: string;

  /** Page size, 1..50 (default 20). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REVIEW_PAGE_SIZE)
  limit?: number;
}
