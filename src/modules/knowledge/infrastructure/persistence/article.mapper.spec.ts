import { buildArticle } from '../../application/ports/fakes';
import { EArticleStatus } from '../../domain';
import { ArticleMapper } from './article.mapper';

describe('ArticleMapper', () => {
  it('round-trips every field (locale fixed to vi)', () => {
    const article = buildArticle({
      status: EArticleStatus.DRAFT,
      reviewedBy: null,
      reviewedAt: null,
    });

    const row = ArticleMapper.toOrm(article);

    expect(row.locale).toBe('vi');
    expect(ArticleMapper.toDomain(row)).toEqual(article);
  });
});
