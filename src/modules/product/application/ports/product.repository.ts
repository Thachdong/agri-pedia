import { Product } from '../../domain';

/** Position after which the next page starts (the last item of the previous page). */
export type TProductPageKey = { createdAt: Date; id: string };

export type TProductPageQuery = {
  after?: TProductPageKey;
  limit: number;
};

export interface IProductRepository {
  /** Deleted (soft) products are treated as missing. */
  findById(id: string): Promise<Product | null>;
  /** ACTIVE, not deleted products of the seller, newest first (createdAt desc, id desc). */
  findActiveByUser(
    userId: string,
    query: TProductPageQuery,
  ): Promise<Product[]>;
  /** Every product of the seller, any status, deleted included; no order. */
  findAllByUser(userId: string): Promise<Product[]>;
  save(product: Product): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
