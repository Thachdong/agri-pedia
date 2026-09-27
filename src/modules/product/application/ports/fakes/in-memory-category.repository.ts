import { ICategoryRepository, TCategory } from '../category.repository';

export class InMemoryCategoryRepository implements ICategoryRepository {
  readonly items = new Map<string, TCategory>();

  add(...categories: TCategory[]): void {
    categories.forEach((category) => this.items.set(category.id, category));
  }

  async existsById(id: string): Promise<boolean> {
    return this.items.has(id);
  }

  async findAll(): Promise<TCategory[]> {
    return [...this.items.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}
