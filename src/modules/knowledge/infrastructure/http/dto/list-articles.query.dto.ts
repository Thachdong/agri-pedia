import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { EDiseaseCategory } from '../../../domain';

export const DEFAULT_ARTICLE_PAGE_SIZE = 50;
export const MAX_ARTICLE_PAGE_SIZE = 100;

export class ListArticlesQueryDto {
  /** Crop slug from GET /knowledge/articles/crops, e.g. `lua`. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  crop: string;

  /** Category of the article's disease. */
  @IsOptional()
  @IsEnum(EDiseaseCategory)
  category?: EDiseaseCategory;

  /** `nextCursor` from the previous page; omit for the first page. */
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cursor?: string;

  /** Page size, 1..100 (default 50). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ARTICLE_PAGE_SIZE)
  limit?: number;
}
