import { DomainException, EDomainErrorType } from '@shared/domain';

/** Pagination cursor was not produced by this API (or was altered). */
export class InvalidChatCursorException extends DomainException {
  constructor() {
    super(
      'CHAT_INVALID_CURSOR',
      'Invalid pagination cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
