export class CatalogItemResponse {
  id: string;
  name: string;
  description: string;
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
