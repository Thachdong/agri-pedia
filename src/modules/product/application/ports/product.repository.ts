import { Product } from '../../domain';

export interface IProductRepository {
  /** Deleted (soft) products are treated as missing. */
  findById(id: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
