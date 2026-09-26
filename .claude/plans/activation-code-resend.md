# Feature: Resend activation code (DISTRIBUTOR)

Source: specs/api.md action 3 (resend), `purpose` dropped from input (always ACTIVATE_DISTRIBUTOR), same as activate.

Flow: `POST /auth/resend { identifier }` (otp module) → otp.ResendActivationOtp
  (user query port: identifier → userId + hashedIdentifier + normalized identifier; find latest ACTIVATE_DISTRIBUTOR otp;
   consumed → error; blocked (now < blockUntil) → error, even if expired; expired and not blocked → issue a new otp and send it; otherwise retryCount++, block when > max, else decrypt and send the same code).
No cross-module write → no event.

- [x] 1. [domain-model]  otp: Otp.resend (checks consumed/blocked, signals expired, retryCount++, block with RETRY_COUNT_MAXIMUM when > OTP_MAX_RETRY_COUNT for OTP_RETRY_BLOCK_SECONDS); no new exception (reuse OtpAlreadyConsumed, OtpBlocked)
- [x] 2. [query-port]    user: add normalized `identifier` to TUserIdentifierSummary (recipient of the message)
- [x] 3. [use-case]      otp: ResendActivationOtp (reuses IOtpRepository.findLatest/save; message text shared with IssueOtp)
- [x] 4. [http]          POST /auth/resend (docs entry added here: defineApiDocs requires every handler to compile)
- [x] 5. [api-docs]      POST /auth/resend (verify /docs-json)
- [x] 6. [boundary-review]

No persistence/migration step: columns retry_count, block_until, block_reason and findLatest already exist.
Order note: query-port (2) before the use case (3) because the use case depends on it.

## Decisions (approved)
1. Latest otp expired — DECIDED: block checked first. Still blocked (now < blockUntil) → 422 OTP_BLOCKED. Block over (or never blocked) → issue a new otp (retryCount 0) and send it, 200; the expired one is not counted.
2. Retry block shares `blockUntil` with the wrong-code block: while blocked, both activate and resend return OTP_BLOCKED. → yes, one block field per spec
3. The resend that exceeds the limit: 422 OTP_BLOCKED with blockUntil, code not sent
4. Not expired: resend the same code, expiry not extended; message says minutes left
5. No otp / consumed otp while user still PENDING (lost event, failed activation): spec has no recovery. → not handled: 404 OTP_NOT_FOUND / 422 OTP_ALREADY_CONSUMED
6. Success: 200, empty body
