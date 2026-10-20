import { TopArticleSettings } from '../../domain';

export interface ITopArticleSettingsRepository {
  /** Saved settings; defaults when none were saved. */
  get(): Promise<TopArticleSettings>;
  save(settings: TopArticleSettings): Promise<void>;
}

export const TOP_ARTICLE_SETTINGS_REPOSITORY = Symbol(
  'TOP_ARTICLE_SETTINGS_REPOSITORY',
);
