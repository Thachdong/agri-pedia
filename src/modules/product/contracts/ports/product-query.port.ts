export type TProductOwnerSummary = {
  productId: string;
  /** Seller (a DISTRIBUTOR). */
  userId: string;
  /** Status is ACTIVE (listed for sale). */
  isActive: boolean;
};

/** A product as shown next to its reviews. */
export type TProductNameSummary = {
  productId: string;
  name: string;
};

export interface IProductQueryPort {
  /** Deleted (soft) products are treated as missing. */
  findOwnerById(productId: string): Promise<TProductOwnerSummary | null>;
  /** Every product the seller ever listed: any status, deleted included. */
  listBySeller(sellerId: string): Promise<TProductNameSummary[]>;
}
