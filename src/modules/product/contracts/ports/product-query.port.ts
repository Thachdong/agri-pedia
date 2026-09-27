export type TProductOwnerSummary = {
  productId: string;
  /** Seller (a DISTRIBUTOR). */
  userId: string;
  /** Status is ACTIVE (listed for sale). */
  isActive: boolean;
};

export interface IProductQueryPort {
  /** Deleted (soft) products are treated as missing. */
  findOwnerById(productId: string): Promise<TProductOwnerSummary | null>;
}
