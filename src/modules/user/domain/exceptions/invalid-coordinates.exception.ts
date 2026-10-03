import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidCoordinatesException extends DomainException {
  constructor(lat: number, long: number) {
    super(
      'USER_INVALID_COORDINATES',
      `Invalid coordinates: (${lat}, ${long})`,
      EDomainErrorType.VALIDATION,
      { lat, long },
    );
  }
}
