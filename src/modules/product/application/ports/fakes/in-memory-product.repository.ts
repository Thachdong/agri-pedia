import { EProductStatus, Product } from '../../../domain';
import { IProductRepository, TProductPageQuery } from '../product.repository';

const newestFirst = (a: Product, b: Product) =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

export class InMemoryProductRepository implements IProductRepository {
  readonly items = new Map<string, Product>();

  async findById(id: string): Promise<Product | null> {
    const product = this.items.get(id);
    return product && product.deletedAt === null ? product : null;
  }

  async findActiveByUser(
    userId: string,
    { after, limit }: TProductPageQuery,
  ): Promise<Product[]> {
    return [...this.items.values()]
      .filter(
        (product) =>
          product.userId === userId &&
          product.status === EProductStatus.ACTIVE &&
          product.deletedAt === null,
      )
      .sort(newestFirst)
      .filter(
        (product) =>
          !after ||
          product.createdAt.getTime() < after.createdAt.getTime() ||
          (product.createdAt.getTime() === after.createdAt.getTime() &&
            product.id < after.id),
      )
      .slice(0, limit);
  }

  async save(product: Product): Promise<void> {
    this.items.set(product.id, product);
  }
}
