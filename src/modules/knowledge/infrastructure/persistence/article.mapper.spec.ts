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

  it('round-trips a variant article', () => {
    const article = buildArticle({
      variantCode: 'RICE_BLAST__V1',
      slug: 'benh-dao-on-la',
    });

    const row = ArticleMapper.toOrm(article);

    expect(row.variantCode).toBe('RICE_BLAST__V1');
    expect(ArticleMapper.toDomain(row)).toEqual(article);
  });
});
