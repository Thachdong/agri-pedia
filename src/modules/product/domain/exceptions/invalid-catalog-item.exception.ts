import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidCatalogItemException extends DomainException {
  constructor(field: string, reason: string) {
    super(
      'PRODUCT_CATALOG_ITEM_INVALID',
      `Invalid catalog item ${field}: ${reason}`,
      EDomainErrorType.VALIDATION,
      { field, reason },
    );
  }
}
