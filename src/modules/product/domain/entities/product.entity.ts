import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EProductStatus } from '../enums/product-status.enum';
import { EProductUnit } from '../enums/product-unit.enum';
import { InvalidProductPriceException } from '../exceptions/invalid-product-price.exception';
import { InvalidProductQuantityException } from '../exceptions/invalid-product-quantity.exception';
import { ProductNotOwnerException } from '../exceptions/product-not-owner.exception';

export type TProductProps = {
  userId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: EProductUnit;
  categoryId: string;
  status: EProductStatus;
};

export type TCreateProductProps = Omit<TProductProps, 'status'>;

/** Fields a seller may change; omitted fields are kept. */
export type TUpdateProductProps = Partial<Omit<TProductProps, 'userId'>>;

export class Product extends AggregateRoot {
  private constructor(
    id: string,
    private props: TProductProps,
  ) {
    super(id);
  }

  /** New product is listed right away (ACTIVE). */
  static create(input: TCreateProductProps): Product {
    Product.assertValidPrice(input.price);
    Product.assertValidQuantity(input.quantity);
    return new Product(randomUUID(), {
      userId: input.userId,
      name: input.name.trim(),
      description: input.description.trim(),
      price: input.price,
      quantity: input.quantity,
      unit: input.unit,
      categoryId: input.categoryId,
      status: EProductStatus.ACTIVE,
    });
  }

  static restore(id: string, props: TProductProps): Product {
    return new Product(id, { ...props });
  }

  /** Throws unless the product was listed by `userId`. */
  assertOwnedBy(userId: string): void {
    if (this.props.userId !== userId) {
      throw new ProductNotOwnerException(this.id, userId);
    }
  }

  /** Applies the given changes; validates price/quantity like create. */
  update(changes: TUpdateProductProps): void {
    if (changes.price !== undefined) {
      Product.assertValidPrice(changes.price);
    }
    if (changes.quantity !== undefined) {
      Product.assertValidQuantity(changes.quantity);
    }
    this.props = {
      ...this.props,
      ...(changes.name !== undefined && { name: changes.name.trim() }),
      ...(changes.description !== undefined && {
        description: changes.description.trim(),
      }),
      ...(changes.price !== undefined && { price: changes.price }),
      ...(changes.quantity !== undefined && { quantity: changes.quantity }),
      ...(changes.unit !== undefined && { unit: changes.unit }),
      ...(changes.categoryId !== undefined && {
        categoryId: changes.categoryId,
      }),
      ...(changes.status !== undefined && { status: changes.status }),
    };
  }

  private static assertValidPrice(price: number): void {
    if (!Number.isFinite(price) || price < 0) {
      throw new InvalidProductPriceException(price);
    }
  }

  private static assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InvalidProductQuantityException(quantity);
    }
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): number {
    return this.props.price;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unit(): EProductUnit {
    return this.props.unit;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get status(): EProductStatus {
    return this.props.status;
  }
}
