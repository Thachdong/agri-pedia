import { CatalogItem } from '../../domain';

export interface ICatalogRepository {
  /** Item whose normalized name is most similar to `normalizedName`, when similar enough (configured threshold). */
  findBestMatch(normalizedName: string): Promise<CatalogItem | null>;
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
