import { EBusinessType } from '../../../domain';

export class DistributorProfileAddressResponse {
  id: string;
  /** Province codename. */
  province: string;
  /** Ward codename. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
  isPrimary: boolean;
}

export class DistributorProfileResponse {
  id: string;
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  createdAt: Date;
  /** Primary first, then by id. */
  addresses: DistributorProfileAddressResponse[];
}
