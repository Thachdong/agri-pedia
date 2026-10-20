import { CatalogItem } from '../../../domain';
import {
  ICatalogRepository,
  TCatalogPage,
  TCatalogPageQuery,
} from '../catalog.repository';

/** Matches on the exact normalized name (similarity is the Postgres adapter's job). */
export class InMemoryCatalogRepository implements ICatalogRepository {
  readonly items = new Map<string, CatalogItem>();

  add(...items: CatalogItem[]): void {
    items.forEach((item) => this.items.set(item.id, item));
  }

  async findBestMatch(normalizedName: string): Promise<CatalogItem | null> {
    return this.findByNormalizedName(normalizedName);
  }

  async findById(id: string): Promise<CatalogItem | null> {
    return this.items.get(id) ?? null;
  }

  async findByNormalizedName(
    normalizedName: string,
  ): Promise<CatalogItem | null> {
    return (
      [...this.items.values()].find(
        (item) => item.normalizedName === normalizedName,
      ) ?? null
    );
  }

  async listPage(query: TCatalogPageQuery): Promise<TCatalogPage> {
    const matching = [...this.items.values()]
      .filter(
        (item) => !query.search || item.normalizedName.includes(query.search),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      items: matching.slice(query.offset, query.offset + query.limit),
      total: matching.length,
    };
  }

  async save(item: CatalogItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
