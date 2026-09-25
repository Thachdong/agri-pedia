# Feature: User registration (FARMER | DISTRIBUTOR)

Source: specs/api.md action 1 (register), specs/entities.md (User, Address, OTP).

Flow: `POST /auth/register` → user.RegisterUser (User + primary Address, 1 transaction)
→ emits `user.account.registered` → otp module handles (DISTRIBUTOR only) → otp.IssueOtp (ACTIVATE_DISTRIBUTOR) → send code.

- [x] 1. [config-group]       `security` (identifier hash secret, identifier encryption key) + `otp` (length, TTL, max wrong, max retry, wrong-count block duration, retry-count block duration — 2 separate envs)
- [x] 2. [shared-wrapper]     `crypto` — hash identifier (HMAC), encrypt/decrypt (AES-GCM), hash/verify password (node scrypt, no new package)
- [x] 3. [shared-wrapper]     `messaging` — IMessageSender (EMAIL | PHONE); dev adapter logs message, real provider later
- [x] 4. [module-scaffold]    module `user`
- [x] 5. [module-scaffold]    module `otp`
- [x] 6. [domain-model]       user: aggregate User (ELoginType, EUserRole, EBusinessType, EUserStatus — status from role), aggregate Address; errors UserIdentifierAlreadyUsed, BusinessTypeRequired, BusinessTypeNotAllowed, InvalidCoordinates
- [x] 7. [domain-model]       otp: aggregate Otp (EOtpSender, EOtpPurpose, issue + expiry) — issue only, verify/block logic comes with activate/resend features
- [x] 8. [domain-event]       user: UserRegistered
- [x] 9. [use-case]           user: RegisterUser, ports IUserRepository, IAddressRepository
- [x] 10. [use-case]          otp: IssueOtp, port IOtpRepository (sends via IMessageSender after commit)
- [x] 11. [persistence]       user: PgUserRepository, PgAddressRepository; tables `users`, `addresses`
- [x] 12. [persistence]       otp: PgOtpRepository; table `otps`
- [x] 13. [integration-event] RegisterUser emits `user.account.registered`
- [x] 14. [event-handler]     otp: `user.account.registered` (role DISTRIBUTOR) → IssueOtp(purpose ACTIVATE_DISTRIBUTOR, sender = loginType)
- [x] 15. [http]              POST /auth/register
- [x] 16. [boundary-review]

## Follow-up: move "who needs activation OTP" rule into user module (boundary-review LOW #9)
- [x] 17. [domain-event]       user: IdentifierVerificationRequested (recorded by User.register only when status PENDING)
- [x] 18. [integration-event]  RegisterUser emits `user.identifier.verification-requested` { userId, loginType, identifier }
- [ ] 19. [event-handler]      otp: subscribe to `user.identifier.verification-requested` → IssueOtp(ACTIVATE_DISTRIBUTOR); drop role branch + `user.account.registered` subscription
- [ ] 20. [boundary-review]
Scope: register only. Reset-password (`user.password.reset-requested`) comes with its own feature.

## Decisions (defaults — change if wrong)
- Address lives in `user` module (later: distributor geo search needs user + primary address without cross-module join).
- OTP separate module (reused by activate, resend, reset-password).
- Duplicate identifier (same hashedIdentifier) → 409 `USER_IDENTIFIER_ALREADY_USED`.

## Open questions (default in brackets)
1. username: spec has `username` input AND "username = identifier". [username input optional; fallback = identifier]
2. identifierVerifiedAt from client? [ignore — server sets, null at register]
3. bussinessType: [required for DISTRIBUTOR, must be null for FARMER]
4. avatar / bussinessLicense are mediaIds, media module not exist yet. [drop from register; set later via update user]
5. OTP code: resend says "decode hashCode" → must be reversible. [AES-encrypt code, column keeps name hashCode]
6. OTP.identifier stored as [hashedIdentifier]; plaintext identifier only travels in event payload to send the code.
7. Email/SMS provider? [none yet — log-only sender]
