import { DomainException, EDomainErrorType } from '../domain';

/** Missing, malformed, tampered or expired access token. */
export class InvalidAccessTokenException extends DomainException {
  constructor() {
    super(
      'AUTH_INVALID_ACCESS_TOKEN',
      'Missing or invalid access token',
      EDomainErrorType.UNAUTHORIZED,
    );
  }
}
