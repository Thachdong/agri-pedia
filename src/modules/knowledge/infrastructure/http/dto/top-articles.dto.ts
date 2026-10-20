import { ArrayMaxSize, IsArray, IsInt, Length, Matches } from 'class-validator';
import { TOP_ARTICLES_LIMIT_BOUNDS } from '../../../domain';

export class UpdateTopArticleSettingsDto {
  /** Top articles an admin may choose per crop, 1..50. */
  @IsInt()
  limit: number;
}

export class SetCropTopArticlesDto {
  /** Slugs of published articles of the crop, first = top; at most `limit`; empty clears the list. */
  @IsArray()
  @ArrayMaxSize(TOP_ARTICLES_LIMIT_BOUNDS.max)
  @Matches(new RegExp('^[a-z0-9]+(-[a-z0-9]+)*$'), { each: true })
  @Length(1, 100, { each: true })
  articleSlugs: string[];
}
