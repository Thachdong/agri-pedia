# Feature: Change password by old password (FARMER | DISTRIBUTOR, logged in)

Source: specs/api.md action 8 (change-password by old password).

Flow: `POST /auth/change-password { oldPassword, newPassword }` (AccessTokenGuard, user module)
→ user.ChangePassword (userId from access token; findById: none → USER_NOT_FOUND;
   crypto.verifyPassword(oldPassword, user.passwordHash): false → USER_WRONG_PASSWORD;
   hashPassword(newPassword); user.changePassword(hash) (existing); save;
   revoke every refresh token of the user (revokeAllByHashedIdentifier, existing) — all in one transaction)
Reuses existing: User.changePassword, IUserRepository, IRefreshTokenRepository, ICryptoService, AccessTokenGuard + @CurrentUser. No new table/migration.

- [x] 1. [domain-model]       user: exception WrongPassword (USER_WRONG_PASSWORD)
- [x] 2. [use-case]           user: ChangePassword (IUserRepository, IRefreshTokenRepository, existing)
- [ ] 3. [http]               POST /auth/change-password (AuthController, guarded)
- [ ] 4. [api-docs]           POST /auth/change-password
- [ ] 5. [boundary-review]

## Decisions (approved)
1. Wrong oldPassword → WrongPassword exception, EDomainErrorType.VALIDATION → 400 (not 401: client must not read it as expired session).
2. After the change every refresh token of the user is revoked (all sessions end). specs/api.md action 8 updated.
3. newPassword: string, 8–128 chars (same as register). Route POST /auth/change-password, 200, body null.
