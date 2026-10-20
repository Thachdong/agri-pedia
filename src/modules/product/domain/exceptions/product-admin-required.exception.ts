import { DomainException, EDomainErrorType } from '@shared/domain';

/** Catalog and suggestion settings are managed by ACTIVE admins only. */
export class ProductAdminRequiredException extends DomainException {
  constructor(userId: string) {
    super(
      'PRODUCT_ADMIN_REQUIRED',
      `User ${userId} is not an active admin`,
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
