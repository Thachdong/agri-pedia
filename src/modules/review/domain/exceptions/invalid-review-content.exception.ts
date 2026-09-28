import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidReviewContentException extends DomainException {
  constructor(maxLength: number) {
    super(
      'REVIEW_INVALID_CONTENT',
      `Content must be 1 to ${maxLength} characters`,
      EDomainErrorType.VALIDATION,
      { maxLength },
    );
  }
}
