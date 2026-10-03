import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { EReviewTargetType } from '../../../domain';

export const DEFAULT_REVIEW_PAGE_SIZE = 20;
export const MAX_REVIEW_PAGE_SIZE = 50;

export class ListDistributorReviewsQueryDto {
  /** Shop whose reviews are listed. */
  @IsUUID()
  distributorId: string;

  /** USER: reviews of the shop itself; PRODUCT: reviews of its products; omit for both. */
  @IsOptional()
  @IsEnum(EReviewTargetType)
  targetType?: EReviewTargetType;

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
