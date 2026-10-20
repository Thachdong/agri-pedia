import { DomainException, EDomainErrorType } from '@shared/domain';

export class CatalogItemNotFoundException extends DomainException {
  constructor(catalogItemId: string) {
    super(
      'PRODUCT_CATALOG_ITEM_NOT_FOUND',
      `Catalog item ${catalogItemId} not found`,
      EDomainErrorType.NOT_FOUND,
      { catalogItemId },
    );
  }
}
