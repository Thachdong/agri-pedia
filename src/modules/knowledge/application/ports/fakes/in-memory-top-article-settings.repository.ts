import { TopArticleSettings } from '../../../domain';
import { ITopArticleSettingsRepository } from '../top-article-settings.repository';

export class InMemoryTopArticleSettingsRepository implements ITopArticleSettingsRepository {
  /** Saved limit; null = never saved. */
  savedLimit: number | null = null;

  async get(): Promise<TopArticleSettings> {
    return this.savedLimit === null
      ? TopArticleSettings.defaults()
      : TopArticleSettings.restore({ limit: this.savedLimit });
  }

  async save(settings: TopArticleSettings): Promise<void> {
    this.savedLimit = settings.limit;
  }
}
