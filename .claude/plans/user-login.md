# Feature: Login (FARMER | DISTRIBUTOR)

Source: specs/api.md action 4 (login), specs/entities.md 11 (Refresh token).

Flow: `POST /auth/login { loginType, identifier, password }` (user module) → user.LoginUser
  (normalize + hash identifier; find user by hashedIdentifier; not found / loginType mismatch / wrong password → INVALID_CREDENTIALS;
   status != ACTIVE → USER_NOT_ACTIVE; sign access token { userId }; create RefreshToken (new familyId, ACTIVE) and save its hash; return tokens + profile).
No cross-module call, no event.

- [x] 1. [config-group]    `auth`: access token secret + TTL, refresh token TTL
- [x] 2. [shared-wrapper]  crypto: add verifyPassword, randomToken
- [x] 3. [shared-wrapper]  access-token (`@nestjs/jwt`): IAccessTokenService.sign(payload) (sign only; verify comes with the auth guard)
- [x] 4. [domain-model]    user: RefreshToken aggregate (issue), ERefreshTokenStatus, User.assertCanLogin; errors InvalidCredentials (UNAUTHORIZED), UserNotActive (FORBIDDEN)
- [x] 5. [use-case]        LoginUser, port IRefreshTokenRepository
- [x] 6. [persistence]     PgRefreshTokenRepository, table `refresh_tokens` + migration
- [x] 7. [http]            POST /auth/login
- [x] 8. [api-docs]        POST /auth/login
- [x] 9. [boundary-review]

## Open questions
1. Tokens in response: spec response lists no accessToken/refreshToken. Proposal: body `{ accessToken, refreshToken, user: {...profile} }`. Alternative: refreshToken in httpOnly cookie.
2. blockUntil / blockReason in response: User has no such fields (they belong to OTP). Proposal: drop.
3. RefreshToken owner: proposal user module (auth endpoints already live there). Alternative: new `auth` module using IUserQueryPort.
4. Refresh token row: spec keys it by hashedIdentifier (no userId). Proposal: follow spec.
5. Unknown identifier and wrong password return the same 401 INVALID_CREDENTIALS (no account enumeration); PENDING distributor → 403 USER_NOT_ACTIVE (checked after password).
