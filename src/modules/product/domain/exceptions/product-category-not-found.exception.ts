import { DomainException, EDomainErrorType } from '@shared/domain';

export class ProductCategoryNotFoundException extends DomainException {
  constructor(categoryId: string) {
    super(
      'PRODUCT_CATEGORY_NOT_FOUND',
      `Category ${categoryId} not found`,
      EDomainErrorType.NOT_FOUND,
      { categoryId },
    );
  }
}
