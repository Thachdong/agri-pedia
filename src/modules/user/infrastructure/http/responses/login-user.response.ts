import { EBusinessType, ELoginType, EUserRole } from '../../../domain';

export class LoginUserAddressResponse {
  /** Province codename. */
  province: string;
  /** Ward codename. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
}

export class LoginUserProfileResponse {
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
  address: LoginUserAddressResponse | null;
}

export class LoginUserResponse {
  /** JWT, send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;
  /** Opaque token, shown only once. */
  refreshToken: string;
  user: LoginUserProfileResponse;
}
