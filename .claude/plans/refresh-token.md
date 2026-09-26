# Feature: Refresh token (FARMER | DISTRIBUTOR)

Source: specs/api.md action 5 (refresh-token), specs/entities.md 11 (Refresh token). Builds on user-login.md.

Flow: `POST /auth/refresh-token { refreshToken }` (user module) → user.RefreshAccessToken
  (hash token; find by hash (row locked); not found / expired → INVALID_REFRESH_TOKEN;
   ACTIVE → rotate: token ROTATED, child ACTIVE in same family (rotatedFromId = token.id);
   ROTATED within grace period → find child; child ACTIVE → rotate the child instead; otherwise reuse → revoke family, INVALID_REFRESH_TOKEN;
   ROTATED past grace period → reuse detected → revoke family, INVALID_REFRESH_TOKEN;
   REVOKED → revoke family, INVALID_REFRESH_TOKEN;
   owner (find user by hashedIdentifier) must still be ACTIVE; sign access token { userId }; return { accessToken, refreshToken }).
No cross-module call, no event.

- [x] 1. [config-group]    `auth`: add refresh token grace period (seconds)
- [ ] 2. [domain-model]    user: RefreshToken gets updatedAt + rotate (→ child) / revoke / isExpired; error InvalidRefreshToken (UNAUTHORIZED)
- [ ] 3. [use-case]        RefreshAccessToken; IRefreshTokenRepository + findByHashedToken, findChild, revokeFamily
- [ ] 4. [persistence]     PgRefreshTokenRepository new methods (row lock on lookup); migration: updated_at column, indexes family_id, rotated_from_id
- [ ] 5. [http]            POST /auth/refresh-token
- [ ] 6. [api-docs]        POST /auth/refresh-token
- [ ] 7. [boundary-review] (also covers login, user-login.md step 9)

## Decisions (approved)
1. ROTATED within grace: child still ACTIVE → rotate the child, return a new pair; otherwise reuse → revoke family, 401.
2. ROTATED past grace: token reuse → revoke family, 401.
3. Expired: 401 INVALID_REFRESH_TOKEN, no revoke.
4. Owner not found / not ACTIVE: 401 INVALID_REFRESH_TOKEN.
5. Grace default 30 s (`AUTH_REFRESH_TOKEN_GRACE_SECONDS`).
6. Child gets a fresh TTL (sliding session).
Note: family revoke is committed before the 401 is thrown (throwing inside the transaction would roll it back).
