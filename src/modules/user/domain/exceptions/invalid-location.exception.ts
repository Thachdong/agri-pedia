import { DomainException, EDomainErrorType } from '@shared/domain';

/** Province codename is unknown, or the ward is unknown / belongs to another province. */
export class InvalidLocationException extends DomainException {
  constructor(provinceCode: string, wardCode: string | null = null) {
    super(
      'USER_LOCATION_INVALID',
      wardCode === null
        ? `Unknown province "${provinceCode}"`
        : `Unknown ward "${wardCode}" in province "${provinceCode}"`,
      EDomainErrorType.VALIDATION,
      { provinceCode, wardCode },
    );
  }
}
