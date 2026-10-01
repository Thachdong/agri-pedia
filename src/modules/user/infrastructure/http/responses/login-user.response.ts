import { UserProfileResponse } from './user-profile.response';

export class LoginUserResponse {
  /** JWT, send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;
  /** Opaque token, shown only once. */
  refreshToken: string;
  user: UserProfileResponse;
}
