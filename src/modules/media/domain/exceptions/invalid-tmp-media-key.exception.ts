import { DomainException, EDomainErrorType } from '@shared/domain';

/** Key is not a TMP upload of this user with the declared extension. */
export class InvalidTmpMediaKeyException extends DomainException {
  constructor(key: string, uploaderId: string) {
    super(
      'MEDIA_INVALID_TMP_KEY',
      `Key ${key} is not a TMP upload of user ${uploaderId}`,
      EDomainErrorType.VALIDATION,
      { key, uploaderId },
    );
  }
}
