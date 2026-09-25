# Feature: Activate DISTRIBUTOR account (identifier + code)

Source: specs/api.md action 2 (activate), `purpose` dropped from input (always ACTIVATE_DISTRIBUTOR).

Flow: `POST /auth/activate` (otp module) → otp.VerifyActivationOtp
  (user query port: identifier → userId + hashedIdentifier; find latest ACTIVATE_DISTRIBUTOR otp; check consumed/blocked/expired; compare code; wrong → wrongCount++, block when > max)
→ emits `otp.activation-code.verified` { userId } → user module handles → user.ActivateUser (PENDING → ACTIVE, identifierVerifiedAt = now).

- [x] 1. [shared-wrapper]     crypto: add `decrypt` (stored code is AES-encrypted, needed to compare)
- [x] 2. [domain-model]       otp: Otp behaviours (assert usable, record wrong attempt + block, consume); errors OtpNotFound, OtpAlreadyConsumed, OtpBlocked, OtpExpired, OtpInvalidCode
- [x] 3. [domain-model]       user: User.activate(); error UserNotFound
- [x] 4. [query-port]         user: IUserQueryPort.findByIdentifier (normalize + hash inside user module) → { userId, hashedIdentifier }; consumed by otp
- [ ] 5. [use-case]           otp: VerifyActivationOtp, port IOtpRepository.findLatest(hashedIdentifier, purpose)
- [ ] 6. [use-case]           user: ActivateUser, port IUserRepository.findById
- [ ] 7. [persistence]        otp: PgOtpRepository.findLatest
- [ ] 8. [persistence]        user: PgUserRepository.findById
- [ ] 9. [integration-event]  VerifyActivationOtp emits `otp.activation-code.verified`
- [ ] 10. [event-handler]     user: `otp.activation-code.verified` → ActivateUser
- [ ] 11. [http]              POST /auth/activate
- [ ] 12. [api-docs]          POST /auth/activate
- [ ] 13. [boundary-review]

Order note: query-port (4) before the otp use case (5) because the use case depends on it.

## Decisions (defaults — change if wrong)
- Endpoint lives in otp module: OTP verification mutates otp state (wrongCount, consumed), and a sync cross-module call is allowed for reads only. Identifier normalization/hash stays in user module (read-only query port), user status change goes through an event.
- Wrong code: wrongCount++ is committed, then the error is thrown (outside the transaction, otherwise it would roll back).
- Already ACTIVE user on ActivateUser → no-op (handler idempotent).

## Open questions (default in brackets)
1. HTTP codes: [OTP_NOT_FOUND 404 (also when identifier unknown), OTP_INVALID_CODE 400, OTP_ALREADY_CONSUMED / OTP_EXPIRED / OTP_BLOCKED 422 (OTP_BLOCKED details: blockUntil)]
2. Success: [200, empty body]
3. Block rule: spec "wrongCount > max" → [with OTP_MAX_WRONG_COUNT=5 the 6th wrong attempt blocks for OTP_WRONG_BLOCK_SECONDS and returns OTP_BLOCKED]
4. After block ends, same otp usable again until it expires? [yes]
5. Known limitation: in-memory event — if ActivateUser fails, client already got 200 and otp is consumed. [accept for now; resend feature can cover]
