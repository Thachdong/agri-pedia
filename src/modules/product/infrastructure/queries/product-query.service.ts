import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../application/ports';
import { IProductQueryPort, TProductOwnerSummary } from '../../contracts';
import { EProductStatus } from '../../domain';

@Injectable()
export class ProductQueryService implements IProductQueryPort {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
  ) {}

  async findOwnerById(productId: string): Promise<TProductOwnerSummary | null> {
    const product = await this.products.findById(productId);
    return product
      ? {
          productId: product.id,
          userId: product.userId,
          isActive: product.status === EProductStatus.ACTIVE,
        }
      : null;
  }
}
