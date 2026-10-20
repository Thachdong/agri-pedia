import { DomainException, EDomainErrorType } from '@shared/domain';

/** Photo is missing, too large, not a supported type, or cannot be decoded. */
export class SuggestionImageInvalidException extends DomainException {
  constructor(reason: string) {
    super(
      'PRODUCT_SUGGESTION_INVALID_IMAGE',
      `Invalid product photo: ${reason}`,
      EDomainErrorType.VALIDATION,
      { reason },
    );
  }
}
