import { CatalogItem } from '../../domain';

export type TCatalogPageQuery = {
  /** Normalized text the normalized name must contain; omitted = every item. */
  search?: string;
  offset: number;
  limit: number;
};

export type TCatalogPage = {
  /** Sorted by name. */
  items: CatalogItem[];
  /** Items matching the search, over all pages. */
  total: number;
};

export interface ICatalogRepository {
  /** Item whose normalized name is most similar to `normalizedName`, when similar enough (configured threshold). */
  findBestMatch(normalizedName: string): Promise<CatalogItem | null>;
  findById(id: string): Promise<CatalogItem | null>;
  findByNormalizedName(normalizedName: string): Promise<CatalogItem | null>;
  listPage(query: TCatalogPageQuery): Promise<TCatalogPage>;
  /** Insert or update; throws CatalogItemNameTaken when another item has the same normalized name. */
  save(item: CatalogItem): Promise<void>;
  delete(id: string): Promise<void>;
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
