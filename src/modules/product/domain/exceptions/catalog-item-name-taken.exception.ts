import { DomainException, EDomainErrorType } from '@shared/domain';

/** Another catalog item has the same normalized name. */
export class CatalogItemNameTakenException extends DomainException {
  constructor(name: string) {
    super(
      'PRODUCT_CATALOG_ITEM_NAME_TAKEN',
      `A catalog item named "${name}" already exists`,
      EDomainErrorType.CONFLICT,
      { name },
    );
  }
}
