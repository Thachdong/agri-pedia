import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EProductUnit } from '../enums/product-unit.enum';
import { InvalidCatalogItemException } from '../exceptions/invalid-catalog-item.exception';
import { normalizeProductName } from '../services/normalize-product-name';

export const CATALOG_ITEM_NAME_MAX_LENGTH = 255;
export const CATALOG_ITEM_DESCRIPTION_MAX_LENGTH = 5000;

export type TCatalogItemProps = {
  name: string;
  /** normalizeProductName(name); unique across the catalog, used to match names read from photos. */
  normalizedName: string;
  /** Text suggested as the product description (active ingredients, uses, dosage...). */
  description: string;
  /** Category suggested for the product (id from the categories list); null = none. */
  categoryId: string | null;
  /** Unit suggested for the product; null = none. */
  unit: EProductUnit | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TCatalogItemContent = Pick<
  TCatalogItemProps,
  'name' | 'description'
> &
  Partial<Pick<TCatalogItemProps, 'categoryId' | 'unit'>>;

/** Product known to the platform, suggested to distributors who photograph it. Managed by admins. */
export class CatalogItem extends AggregateRoot {
  private constructor(
    id: string,
    private props: TCatalogItemProps,
  ) {
    super(id);
  }

  static create(input: TCatalogItemContent): CatalogItem {
    const now = new Date();
    return new CatalogItem(randomUUID(), {
      ...CatalogItem.validContent(input),
      categoryId: input.categoryId ?? null,
      unit: input.unit ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: TCatalogItemProps): CatalogItem {
    return new CatalogItem(id, { ...props });
  }

  /** Applies the given changes; omitted fields are kept, null clears categoryId / unit. */
  update(changes: Partial<TCatalogItemContent>): void {
    this.props = {
      ...this.props,
      ...CatalogItem.validContent({
        name: changes.name ?? this.props.name,
        description: changes.description ?? this.props.description,
      }),
      ...(changes.categoryId !== undefined && {
        categoryId: changes.categoryId,
      }),
      ...(changes.unit !== undefined && { unit: changes.unit }),
      updatedAt: new Date(),
    };
  }

  private static validContent(
    input: TCatalogItemContent,
  ): Pick<TCatalogItemProps, 'name' | 'normalizedName' | 'description'> {
    const name = input.name.trim();
    const description = input.description.trim();
    const normalizedName = normalizeProductName(name);
    if (name.length > CATALOG_ITEM_NAME_MAX_LENGTH) {
      throw new InvalidCatalogItemException(
        'name',
        `at most ${CATALOG_ITEM_NAME_MAX_LENGTH} characters`,
      );
    }
    if (normalizedName === '') {
      throw new InvalidCatalogItemException(
        'name',
        'must contain a letter or a digit',
      );
    }
    if (
      description === '' ||
      description.length > CATALOG_ITEM_DESCRIPTION_MAX_LENGTH
    ) {
      throw new InvalidCatalogItemException(
        'description',
        `must have 1..${CATALOG_ITEM_DESCRIPTION_MAX_LENGTH} characters`,
      );
    }
    return { name, normalizedName, description };
  }

  get name(): string {
    return this.props.name;
  }

  get normalizedName(): string {
    return this.props.normalizedName;
  }

  get description(): string {
    return this.props.description;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get unit(): EProductUnit | null {
    return this.props.unit;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
