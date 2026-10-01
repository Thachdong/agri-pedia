import { EBusinessType, ELoginType, EUserRole } from '../../../domain';

export class UserAddressResponse {
  /** Province codename. */
  province: string;
  /** Ward codename. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
}

export class UserProfileResponse {
  id: string;
  loginType: ELoginType;
  /** Set when loginType is EMAIL; otherwise null. */
  email: string | null;
  /** Set when loginType is PHONE; otherwise null. */
  phone: string | null;
  username: string;
  role: EUserRole;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  /** Signed read URL (expires); null if none. Spelling follows the API contract. */
  bussinessLicense: string | null;
  /** Signed read URL (expires); null if none. */
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Primary address (map marker); null if the user has none. */
  address: UserAddressResponse | null;
}
