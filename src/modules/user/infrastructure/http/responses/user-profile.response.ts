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
  username: string;
  role: EUserRole;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  /** Media id. Spelling follows the API contract. */
  bussinessLicense: string | null;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Primary address (map marker); null if the user has none. */
  address: UserAddressResponse | null;
}
