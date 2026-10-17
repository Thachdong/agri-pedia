import { buildArticle } from '../../application/ports/fakes';
import { EArticleOrigin, EArticleStatus } from '../../domain';
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

  it('round-trips origin, editor and visibility', () => {
    const article = buildArticle({
      origin: EArticleOrigin.AI_REVIEWED,
      editedBy: '0f8c7a52-1e0b-4c55-9d4b-1f7b8f6c2a01',
      isPublished: false,
    });

    const row = ArticleMapper.toOrm(article);

    expect(row).toMatchObject({
      origin: 'AI_REVIEWED',
      editedBy: '0f8c7a52-1e0b-4c55-9d4b-1f7b8f6c2a01',
      isPublished: false,
    });
    expect(ArticleMapper.toDomain(row)).toEqual(article);
  });
});
