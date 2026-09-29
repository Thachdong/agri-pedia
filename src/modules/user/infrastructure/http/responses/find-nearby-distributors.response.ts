import { EBusinessType } from '../../../domain';

export class NearbyDistributorAddressResponse {
  /** Province codename. */
  province: string;
  /** Ward codename. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
}

export class NearbyDistributorResponse {
  userId: string;
  username: string;
  /** Media id. */
  avatar: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  /** Shop (primary address). */
  address: NearbyDistributorAddressResponse;
  /** Meters from the searched point; null for the area scopes. */
  distanceMeters: number | null;
}

export class FindNearbyDistributorsResponse {
  /** Stage that produced the list. */
  scope: 'radius' | 'nationwide_by_distance' | 'province' | 'nationwide';
  /** Where the searched location came from. */
  source: 'query_point' | 'query_area' | 'address' | 'none';
  items: NearbyDistributorResponse[];
  /** Matches over every page of this scope. */
  total: number;
}
