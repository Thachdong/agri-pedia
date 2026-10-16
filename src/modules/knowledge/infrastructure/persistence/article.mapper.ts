import { Article, EArticleStatus } from '../../domain';
import { ArticleOrmEntity } from './article.orm-entity';

export class ArticleMapper {
  static toDomain(row: ArticleOrmEntity): Article {
    return Article.restore(row.id, {
      cropType: row.cropType,
      diseaseCode: row.diseaseCode,
      variantCode: row.variantCode,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      markdown: row.markdown,
      cover: row.cover,
      images: row.images,
      sources: row.sources,
      status: row.status as EArticleStatus,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      kbVersion: row.kbVersion,
      contentHash: row.contentHash,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
    });
  }

  static toOrm(article: Article): ArticleOrmEntity {
    return Object.assign(new ArticleOrmEntity(), {
      id: article.id,
      cropType: article.cropType,
      diseaseCode: article.diseaseCode,
      variantCode: article.variantCode,
      slug: article.slug,
      locale: 'vi',
      title: article.title,
      summary: article.summary,
      markdown: article.markdown,
      cover: article.cover,
      images: article.images,
      sources: article.sources,
      status: article.status,
      reviewedBy: article.reviewedBy,
      reviewedAt: article.reviewedAt,
      kbVersion: article.kbVersion,
      contentHash: article.contentHash,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    });
  }
}
