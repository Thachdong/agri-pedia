import { KnowledgeInvalidTopArticleSettingsException } from '../exceptions/knowledge-invalid-top-article-settings.exception';
import { TopArticleSettings } from './top-article-settings.entity';

describe('TopArticleSettings', () => {
  it('defaults to 10 top articles per crop', () => {
    expect(TopArticleSettings.defaults().limit).toBe(10);
  });

  it('changes the limit within 1..50', () => {
    const settings = TopArticleSettings.defaults();

    settings.changeLimit(1);
    expect(settings.limit).toBe(1);
    settings.changeLimit(50);
    expect(settings.limit).toBe(50);
  });

  it.each([0, 51, 2.5])(
    'rejects limit %s and keeps the previous one',
    (limit) => {
      const settings = TopArticleSettings.defaults();

      expect(() => settings.changeLimit(limit)).toThrow(
        KnowledgeInvalidTopArticleSettingsException,
      );
      expect(settings.limit).toBe(10);
    },
  );
});
