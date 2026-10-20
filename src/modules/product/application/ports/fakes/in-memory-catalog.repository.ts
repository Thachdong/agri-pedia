import { CatalogItem } from '../../../domain';
import { ICatalogRepository } from '../catalog.repository';

/** Matches on the exact normalized name (similarity is the Postgres adapter's job). */
export class InMemoryCatalogRepository implements ICatalogRepository {
  readonly items = new Map<string, CatalogItem>();

  add(...items: CatalogItem[]): void {
    items.forEach((item) => this.items.set(item.id, item));
  }

  async findBestMatch(normalizedName: string): Promise<CatalogItem | null> {
    return (
      [...this.items.values()].find(
        (item) => item.normalizedName === normalizedName,
      ) ?? null
    );
  }
}
