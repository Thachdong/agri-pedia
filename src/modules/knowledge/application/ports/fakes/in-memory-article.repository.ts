import { Article, referencedDiseaseCodes } from '../../../domain';
import {
  IArticleRepository,
  TArticlePageQuery,
  TArticleRef,
} from '../article.repository';

export class InMemoryArticleRepository implements IArticleRepository {
  readonly articles = new Map<string, Article>();

  async findAllForSeed(): Promise<Article[]> {
    return [...this.articles.values()];
  }

  async replaceArticles(save: Article[], deleteIds: string[]): Promise<void> {
    for (const id of deleteIds) this.articles.delete(id);
    for (const article of save) this.articles.set(article.id, article);
  }

  async findReferencing(diseaseCodes: string[]): Promise<TArticleRef[]> {
    return [...this.articles.values()]
      .filter((article) =>
        referencedDiseaseCodes(article.markdown).some((code) =>
          diseaseCodes.includes(code),
        ),
      )
      .map(({ cropType, slug }) => ({ cropType, slug }));
  }

  async countPublishedByCrop(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const { cropType } of this.published()) {
      counts.set(cropType, (counts.get(cropType) ?? 0) + 1);
    }
    return counts;
  }

  async listPublishedPage(
    cropType: string,
    query: TArticlePageQuery,
  ): Promise<Article[]> {
    const { after, diseaseCodes } = query;
    return this.published()
      .filter((a) => a.cropType === cropType)
      .filter(
        (a) =>
          !diseaseCodes ||
          (a.diseaseCode !== null && diseaseCodes.includes(a.diseaseCode)),
      )
      .sort((a, b) => compare(a.title, b.title) || compare(a.id, b.id))
      .filter(
        (a) =>
          !after ||
          compare(a.title, after.title) > 0 ||
          (compare(a.title, after.title) === 0 && compare(a.id, after.id) > 0),
      )
      .slice(0, query.limit);
  }

  async findPublishedBySlug(
    cropType: string,
    slug: string,
  ): Promise<Article | null> {
    return (
      this.published().find(
        (a) => a.cropType === cropType && a.slug === slug,
      ) ?? null
    );
  }

  async findPublishedByDiseaseCodes(
    diseaseCodes: string[],
  ): Promise<Article[]> {
    return this.published().filter(
      (a) => a.diseaseCode !== null && diseaseCodes.includes(a.diseaseCode),
    );
  }

  async listIndexable(): Promise<Article[]> {
    return [...this.articles.values()].filter((a) => a.isIndexable());
  }

  private published(): Article[] {
    return [...this.articles.values()].filter((a) => a.isPublished);
  }
}

/** Vietnamese order, like the collation the table sorts titles with. */
function compare(a: string, b: string): number {
  return a.localeCompare(b, 'vi');
}
