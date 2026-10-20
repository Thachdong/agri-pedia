import { Length, Matches } from 'class-validator';

export class ArticleParamsDto {
  /** Crop slug, e.g. `lua`. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  cropSlug: string;

  /** Article slug, e.g. `benh-dao-on`. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  slug: string;
}
