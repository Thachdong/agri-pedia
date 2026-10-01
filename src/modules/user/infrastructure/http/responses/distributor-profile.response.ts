import { EBusinessType } from '../../../domain';
import { UserAddressResponse } from './user-profile.response';

export class DistributorProfileResponse {
  id: string;
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  createdAt: Date;
  /** Primary address; null if the distributor has none. */
  address: UserAddressResponse | null;
}
