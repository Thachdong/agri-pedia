import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../application/ports';
import {
  IProductQueryPort,
  TProductNameSummary,
  TProductOwnerSummary,
} from '../../contracts';
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

  async listBySeller(sellerId: string): Promise<TProductNameSummary[]> {
    const products = await this.products.findAllByUser(sellerId);
    return products.map((product) => ({
      productId: product.id,
      name: product.name,
    }));
  }
}
