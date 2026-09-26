export class RefreshAccessTokenResponse {
  /** JWT, send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;
  /** Replaces the one sent; the old one stops working. */
  refreshToken: string;
}
