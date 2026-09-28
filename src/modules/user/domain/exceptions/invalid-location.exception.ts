import { DomainException, EDomainErrorType } from '@shared/domain';

/** Province/ward codename is unknown, or the ward belongs to another province. */
export class InvalidLocationException extends DomainException {
  constructor(provinceCode: string, wardCode: string) {
    super(
      'USER_LOCATION_INVALID',
      `Unknown ward "${wardCode}" in province "${provinceCode}"`,
      EDomainErrorType.VALIDATION,
      { provinceCode, wardCode },
    );
  }
}
