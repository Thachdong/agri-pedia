import { Length, Matches } from 'class-validator';

const SLUG = '^[a-z0-9]+(-[a-z0-9]+)*$';

export class ArticleParamsDto {
  /** Crop slug, e.g. `lua`. */
  @Matches(SLUG)
  @Length(1, 100)
  cropSlug: string;

  /** Article slug, e.g. `benh-dao-on`. */
  @Matches(SLUG)
  @Length(1, 100)
  slug: string;
}
