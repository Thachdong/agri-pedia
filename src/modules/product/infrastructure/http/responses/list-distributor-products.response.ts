import { EProductUnit } from '../../../domain';

export class DistributorProductResponse {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: EProductUnit;
  /** Signed read URL of the first image (expires); null when the product has no image. */
  thumbnail: string | null;
  distributorId: string;
  distributorName: string;
}

export class ListDistributorProductsResponse {
  /** Newest first. */
  products: DistributorProductResponse[];
  /** Pass as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
}
