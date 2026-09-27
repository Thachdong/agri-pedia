import { Product } from '../../../domain';
import { IProductRepository } from '../product.repository';

export class InMemoryProductRepository implements IProductRepository {
  readonly items = new Map<string, Product>();

  async findById(id: string): Promise<Product | null> {
    return this.items.get(id) ?? null;
  }

  async save(product: Product): Promise<void> {
    this.items.set(product.id, product);
  }
}
