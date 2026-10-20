import { KnowledgeTopArticlesInvalidException } from '../exceptions/knowledge-top-articles-invalid.exception';
import { CropTopArticles } from './crop-top-articles.entity';

describe('CropTopArticles', () => {
  it('starts empty', () => {
    const top = CropTopArticles.empty('RICE');

    expect(top.cropType).toBe('RICE');
    expect(top.articleIds).toEqual([]);
  });

  it('replaces the list, keeping the order', () => {
    const top = CropTopArticles.restore({
      cropType: 'RICE',
      articleIds: ['x'],
    });

    top.replace(['c', 'a', 'b'], 3);

    expect(top.articleIds).toEqual(['c', 'a', 'b']);
  });

  it('accepts an empty list', () => {
    const top = CropTopArticles.restore({
      cropType: 'RICE',
      articleIds: ['x'],
    });

    top.replace([], 3);

    expect(top.articleIds).toEqual([]);
  });

  it('rejects more than limit articles', () => {
    const top = CropTopArticles.empty('RICE');

    expect(() => top.replace(['a', 'b', 'c'], 2)).toThrow(
      KnowledgeTopArticlesInvalidException,
    );
    expect(top.articleIds).toEqual([]);
  });

  it('rejects duplicated articles', () => {
    expect(() =>
      CropTopArticles.empty('RICE').replace(['a', 'b', 'a'], 5),
    ).toThrow(
      expect.objectContaining({
        code: 'KNOWLEDGE_TOP_ARTICLES_INVALID',
        details: { reason: 'duplicated articles', articles: ['a'] },
      }),
    );
  });
});
