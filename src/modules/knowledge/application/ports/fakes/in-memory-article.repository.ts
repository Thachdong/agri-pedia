import { Article, referencedDiseaseCodes } from '../../../domain';
import { IArticleRepository, TArticleRef } from '../article.repository';

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
}
