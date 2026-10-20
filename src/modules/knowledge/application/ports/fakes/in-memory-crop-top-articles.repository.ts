import { CropTopArticles } from '../../../domain';
import { ICropTopArticlesRepository } from '../crop-top-articles.repository';

export class InMemoryCropTopArticlesRepository implements ICropTopArticlesRepository {
  /** Article ids by crop code. */
  readonly lists = new Map<string, string[]>();

  async findByCrop(cropType: string): Promise<CropTopArticles> {
    const articleIds = this.lists.get(cropType);
    return articleIds
      ? CropTopArticles.restore({ cropType, articleIds })
      : CropTopArticles.empty(cropType);
  }

  async save(top: CropTopArticles): Promise<void> {
    this.lists.set(top.cropType, top.articleIds);
  }
}
