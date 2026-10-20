import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidSuggestionSettingsException extends DomainException {
  constructor(field: string, reason: string) {
    super(
      'PRODUCT_SUGGESTION_INVALID_SETTINGS',
      `Invalid product suggestion setting ${field}: ${reason}`,
      EDomainErrorType.VALIDATION,
      { field, reason },
    );
  }
}
