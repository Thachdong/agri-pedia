import { Product } from '../../../domain';
import { IProductRepository } from '../product.repository';

export class InMemoryProductRepository implements IProductRepository {
  readonly items = new Map<string, Product>();

  async findById(id: string): Promise<Product | null> {
    const product = this.items.get(id);
    return product && product.deletedAt === null ? product : null;
  }

  async save(product: Product): Promise<void> {
    this.items.set(product.id, product);
  }
}
