import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EProductStatus } from '../enums/product-status.enum';
import { EProductUnit } from '../enums/product-unit.enum';
import { InvalidProductPriceException } from '../exceptions/invalid-product-price.exception';
import { InvalidProductQuantityException } from '../exceptions/invalid-product-quantity.exception';

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

export class Product extends AggregateRoot {
  private constructor(
    id: string,
    private props: TProductProps,
  ) {
    super(id);
  }

  /** New product is listed right away (ACTIVE). */
  static create(input: TCreateProductProps): Product {
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new InvalidProductPriceException(input.price);
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 0) {
      throw new InvalidProductQuantityException(input.quantity);
    }
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
