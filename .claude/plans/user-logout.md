# Feature: Logout (FARMER | DISTRIBUTOR)

Source: not in specs/api.md. Ends the current session = the refresh token family created by login (user-login.md, refresh-token.md).

Flow: `POST /auth/logout { refreshToken }` + `Authorization: Bearer <accessToken>` (user module)
  → AccessTokenGuard (missing/invalid/expired JWT → 401) → user.LogoutUser({ userId, refreshToken })
  (hash token; find by hash (row locked); found AND owned by userId (same hashedIdentifier) → revoke its family;
   not found / expired / already revoked / someone else's → no-op; always 200, empty body).
No domain change for logout, no new port method, no migration. No cross-module call, no event.

- [x] 1. [shared-wrapper]  access-token: verify(token) + AccessTokenGuard + @CurrentUser() (first protected endpoint); error AUTH_INVALID_ACCESS_TOKEN (UNAUTHORIZED)
- [x] 2. [domain-model]    user: User.canLogin(): boolean; assertCanLogin uses it (review LOW #2)
- [x] 3. [use-case]        LogoutUser (reuses IRefreshTokenRepository.findByHashedTokenForUpdate + revokeFamily)
- [ ] 4. [use-case]        RefreshAccessToken: use user.canLogin() (review LOW #2)
- [ ] 5. [http]            POST /auth/logout (guarded); login e2e verifies JWT via IAccessTokenService.verify instead of @nestjs/jwt (review LOW #1)
- [ ] 6. [api-docs]        POST /auth/logout; defineApiDocs gets `auth: true` (bearer scheme + 401), setupSwagger adds bearer auth
- [ ] 7. [boundary-review]

## Decisions (approved)
1. Login required: access token (Bearer) + refresh token in body; token must belong to the caller.
2. Access token stays valid until it expires (15 min); no denylist.
3. Unknown / expired / revoked / someone else's refresh token → 200, no-op.
4. Only the current session (one family).
5. Login timing side-channel (unknown identifier skips scrypt): accepted, not fixed.
