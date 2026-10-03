import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import {
  EProductStatus,
  EProductUnit,
  ProductNotFoundException,
} from '../../domain';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../ports/product.repository';

export type TGetProductDetailInput = { productId: string };

export type TGetProductDetailOutput = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: EProductUnit;
  categoryId: string;
  status: EProductStatus;
  distributorId: string;
  /** By sortOrder; url is a signed read URL. */
  media: { id: string; type: 'IMAGE' | 'VIDEO' | 'FILE'; url: string }[];
};

/** Public detail of a product, any status; a deleted product is not found. */
@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(
    input: TGetProductDetailInput,
  ): Promise<TGetProductDetailOutput> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }
    const media = await this.mediaQuery.listByOwner('PRODUCT', product.id);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      unit: product.unit,
      categoryId: product.categoryId,
      status: product.status,
      distributorId: product.userId,
      media: media.map((item) => ({
        id: item.mediaId,
        type: item.type,
        url: item.url,
      })),
    };
  }
}
