import { ICategoryRepository } from '../category.repository';

export class InMemoryCategoryRepository implements ICategoryRepository {
  readonly ids = new Set<string>();

  async existsById(id: string): Promise<boolean> {
    return this.ids.has(id);
  }
}
