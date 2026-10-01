import { DomainException, EDomainErrorType } from '@shared/domain';

/** No province with this codename. */
export class LocationProvinceNotFoundException extends DomainException {
  constructor(provinceCode: string) {
    super(
      'LOCATION_PROVINCE_NOT_FOUND',
      `Province ${provinceCode} not found`,
      EDomainErrorType.NOT_FOUND,
      { provinceCode },
    );
  }
}
