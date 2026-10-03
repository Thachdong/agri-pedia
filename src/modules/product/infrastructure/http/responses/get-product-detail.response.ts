import { EProductStatus, EProductUnit } from '../../../domain';

export class ProductMediaResponse {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  /** Signed read URL (expires). */
  url: string;
}

export class GetProductDetailResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: EProductUnit;
  categoryId: string;
  status: EProductStatus;
  /** Seller of the product. */
  distributorId: string;
  /** By sortOrder. */
  media: ProductMediaResponse[];
}
