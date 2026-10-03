/** Category has no business rules: read as a plain record. */
export type TCategory = { id: string; name: string };

export interface ICategoryRepository {
  existsById(id: string): Promise<boolean>;
  /** Ordered by name. */
  findAll(): Promise<TCategory[]>;
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
