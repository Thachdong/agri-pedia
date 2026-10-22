import { EProductUnit } from '../../../domain';

export class CatalogItemResponse {
  id: string;
  name: string;
  description: string;
  /** Id from `GET /categories`; null = none. */
  categoryId: string | null;
  unit: EProductUnit | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ListCatalogItemsResponse {
  /** Sorted by name. */
  items: CatalogItemResponse[];
  /** Items matching the search over all pages. */
  total: number;
  page: number;
  limit: number;
}
