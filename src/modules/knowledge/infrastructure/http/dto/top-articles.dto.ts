import { ArrayMaxSize, IsArray, IsInt, Length, Matches } from 'class-validator';
import { TOP_ARTICLES_LIMIT_BOUNDS } from '../../../domain';

const SLUG = '^[a-z0-9]+(-[a-z0-9]+)*$';

export class UpdateTopArticleSettingsDto {
  /** Top articles an admin may choose per crop, 1..50. */
  @IsInt()
  limit: number;
}

export class SetCropTopArticlesDto {
  /** Slugs of published articles of the crop, first = top; at most `limit`; empty clears the list. */
  @IsArray()
  @ArrayMaxSize(TOP_ARTICLES_LIMIT_BOUNDS.max)
  @Matches(new RegExp(SLUG), { each: true })
  @Length(1, 100, { each: true })
  articleSlugs: string[];
}

export class TopArticlesQueryDto {
  /** Crop slug from GET /knowledge/articles/crops, e.g. `lua`. */
  @Matches(SLUG)
  @Length(1, 100)
  crop: string;
}
