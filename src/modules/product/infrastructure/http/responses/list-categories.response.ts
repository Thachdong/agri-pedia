export class CategoryResponse {
  id: string;
  name: string;
}

export class ListCategoriesResponse {
  /** Ordered by name. */
  items: CategoryResponse[];
}
