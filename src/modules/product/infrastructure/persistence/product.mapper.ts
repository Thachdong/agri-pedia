import { EProductStatus, EProductUnit, Product } from '../../domain';
import { ProductOrmEntity } from './product.orm-entity';

export class ProductMapper {
  static toDomain(row: ProductOrmEntity): Product {
    return Product.restore(row.id, {
      userId: row.userId,
      name: row.name,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
      unit: row.unit as EProductUnit,
      categoryId: row.categoryId,
      status: row.status as EProductStatus,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    });
  }

  static toOrm(product: Product): ProductOrmEntity {
    return Object.assign(new ProductOrmEntity(), {
      id: product.id,
      userId: product.userId,
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      unit: product.unit,
      categoryId: product.categoryId,
      status: product.status,
      createdAt: product.createdAt,
      deletedAt: product.deletedAt,
    });
  }
}
