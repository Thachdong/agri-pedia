import { randomUUID } from 'node:crypto';
import { normalizeProductName } from '../services/normalize-product-name';

export type TProductSuggestionMissProps = {
  /** Distributor that sent the photo. */
  userId: string;
  /** Name read from the photo, as read. */
  detectedName: string;
  normalizedName: string;
  createdAt: Date;
};

/** A name read from a photo that matched no catalog item; admins review these to grow the catalog. */
export class ProductSuggestionMiss {
  private constructor(
    readonly id: string,
    private readonly props: TProductSuggestionMissProps,
  ) {}

  static create(input: {
    userId: string;
    detectedName: string;
  }): ProductSuggestionMiss {
    const detectedName = input.detectedName.trim();
    return new ProductSuggestionMiss(randomUUID(), {
      userId: input.userId,
      detectedName,
      normalizedName: normalizeProductName(detectedName),
      createdAt: new Date(),
    });
  }

  static restore(
    id: string,
    props: TProductSuggestionMissProps,
  ): ProductSuggestionMiss {
    return new ProductSuggestionMiss(id, { ...props });
  }

  get userId(): string {
    return this.props.userId;
  }

  get detectedName(): string {
    return this.props.detectedName;
  }

  get normalizedName(): string {
    return this.props.normalizedName;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
