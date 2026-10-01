import { EBusinessType } from '../../../domain';
import { UserAddressResponse } from './user-profile.response';

export class DistributorProfileResponse {
  id: string;
  /** Set when the distributor logs in by email; otherwise null. */
  email: string | null;
  /** Set when the distributor logs in by phone; otherwise null. */
  phone: string | null;
  username: string;
  /** Signed read URL (expires); null if none. */
  avatar: string | null;
  bio: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  /** Signed read URL (expires); null if none. Spelling follows the API contract. */
  bussinessLicense: string | null;
  createdAt: Date;
  /** Primary address; null if the distributor has none. */
  address: UserAddressResponse | null;
}
