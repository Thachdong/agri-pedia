# Feature: Confirm password reset with code (FARMER | DISTRIBUTOR)

Source: specs/api.md action 7 (change-password by token). Follows password-reset-request.md (action 6).

Flow: `POST /auth/reset-password/confirm { identifier, code, newPassword }` (otp module, like POST /auth/activate) → otp.VerifyPasswordResetOtp
  (user query port: identifier → account; not found → OTP_NOT_FOUND;
   latest RESET_PASSWORD otp: none → OTP_NOT_FOUND; Otp.verify (existing): consumed / blocked / expired → error;
   wrong code → wrongCount++ (committed), > OTP_MAX_WRONG_COUNT → block, OTP_INVALID_CODE / OTP_BLOCKED;
   right code → consumed; hash newPassword)
→ emits `otp.password-reset-code.verified` { userId, passwordHash }   (hash, never the plain password, crosses the module boundary)
→ user module handles → user.ResetPassword (user.changePassword(passwordHash); revoke every refresh token of the user).
Event bus is in-process and awaited (emitAsync): the HTTP response waits for the password change.

- [x] 1. [domain-model]       user: User.changePassword(passwordHash)
- [x] 2. [use-case]           otp: VerifyPasswordResetOtp (IOtpRepository.findLatest/save, existing; Otp.verify, existing)
- [ ] 3. [use-case]           user: ResetPassword; IRefreshTokenRepository + revokeAllByHashedIdentifier
- [ ] 4. [persistence]        PgRefreshTokenRepository.revokeAllByHashedIdentifier; migration: index refresh_tokens.hashed_identifier
- [ ] 5. [integration-event]  VerifyPasswordResetOtp emits `otp.password-reset-code.verified`
- [ ] 6. [event-handler]      user: `otp.password-reset-code.verified` → ResetPassword
- [ ] 7. [http]               POST /auth/reset-password/confirm (otp module)
- [ ] 8. [api-docs]           POST /auth/reset-password/confirm
- [ ] 9. [boundary-review]

## Decisions (approved)
1. Route `POST /auth/reset-password/confirm` (otp module); `/auth/change-password` stays for action 8.
2. After the reset every refresh token of the user is revoked (all sessions end).
3. newPassword: string, 8–128 chars (same as register).
4. Otp consumed before the password update; if the update fails → 500, request a new code. Accepted.
