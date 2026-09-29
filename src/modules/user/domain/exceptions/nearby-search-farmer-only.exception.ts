import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only a FARMER may search for nearby distributors. */
export class NearbySearchFarmerOnlyException extends DomainException {
  constructor(userId: string) {
    super(
      'USER_NEARBY_SEARCH_FARMER_ONLY',
      `User ${userId} is not a farmer and cannot search nearby distributors`,
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
