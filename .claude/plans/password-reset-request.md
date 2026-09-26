# Feature: Request password reset (FARMER | DISTRIBUTOR)

Source: specs/api.md action 6 (reset-password). Setting the new password with the code is action 7 (change-password by token) — next plan.

Flow: `POST /auth/reset-password { loginType, identifier }` (otp module, sync like POST /auth/resend) → otp.RequestPasswordResetOtp
  user query port: identifier → { userId, identifier, hashedIdentifier, loginType, canLogin }
    not found / loginType mismatch → 404 OTP_ACCOUNT_NOT_FOUND
    not ACTIVE                     → 403 OTP_ACCOUNT_NOT_ACTIVE
  latest RESET_PASSWORD otp for hashedIdentifier:
    blocked (now < blockUntil)       → 422 OTP_BLOCKED { blockUntil }
    not consumed and not expired     → 409 OTP_ALREADY_REQUESTED { purpose, issuedAt, expiredAt }
    none / consumed / expired        → issue a new otp (IssueOtp logic), send the code, 200 empty body
No event, no migration.

- [x] 1. [domain-model]    otp: Otp.assertReplaceable(now) (blocked → OtpBlocked; still valid → OtpAlreadyRequested); error OtpAlreadyRequested (CONFLICT, code OTP_ALREADY_REQUESTED, details purpose/issuedAt/expiredAt)
- [x] 2. [query-port]      user: TUserIdentifierSummary gets loginType + canLogin
- [ ] 3. [use-case]        otp: RequestPasswordResetOtp (IOtpRepository.findLatest/save, existing); errors OtpAccountNotFound (NOT_FOUND), OtpAccountNotActive (FORBIDDEN)
- [ ] 4. [http]            POST /auth/reset-password (otp module)
- [ ] 5. [api-docs]        POST /auth/reset-password
- [ ] 6. [boundary-review]

## Decisions (approved)
1. Unknown identifier / loginType mismatch → 404; not ACTIVE → 403. Codes are otp-module codes (OTP_ACCOUNT_*): otp cannot throw user-module exceptions.
2. (A) A still-valid request → 409 with issuedAt + expiredAt. Expired and not blocked → new otp + send.
3. Blocked (wrong-code block from action 7) → 422 OTP_BLOCKED with blockUntil, even if expired. (default, not explicitly confirmed)
4. Action 7 in the next plan.
5. Two simultaneous requests can both see "none" and issue two otps; the latest is the valid one. Accepted.
