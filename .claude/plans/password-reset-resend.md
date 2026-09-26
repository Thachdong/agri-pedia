# Feature: Resend the password reset code (FARMER | DISTRIBUTOR)

Source: specs/api.md action 3 (resend, input `identifier` + `purpose`; RESET_PASSWORD for both roles).
Today POST /auth/resend only resends ACTIVATE_DISTRIBUTOR (activation-code-resend.md dropped `purpose`). This plan brings `purpose` back.

Flow: `POST /auth/resend { identifier, purpose }` (otp module) → otp.ResendOtp (was ResendActivationOtp, now per purpose)
  (user query port: identifier → account; not found → OTP_NOT_FOUND;
   latest otp of that purpose: none → OTP_NOT_FOUND; consumed → OTP_ALREADY_CONSUMED; blocked → OTP_BLOCKED (even if expired);
   expired and not blocked → issue a new otp, send it;
   still valid → send the same code, retryCount++; > OTP_MAX_RETRY_COUNT → block OTP_RETRY_BLOCK_SECONDS, OTP_BLOCKED)
Same rules as the activation resend, via the existing Otp.resend. Pairs with POST /auth/reset-password: its 409 OTP_ALREADY_REQUESTED means "use /auth/resend".
No domain change, no event, no migration.

- [x] 1. [use-case]        otp: ResendActivationOtp → ResendOtp({ identifier, purpose }) (rename + purpose; tests for both purposes)
- [x] 2. [http]            POST /auth/resend requires `purpose` (ACTIVATE_DISTRIBUTOR | RESET_PASSWORD); existing resend e2e sends it; new e2e for RESET_PASSWORD
- [x] 3. [api-docs]        POST /auth/resend
- [x] 4. [boundary-review]

## Decisions (approved)
1. One endpoint POST /auth/resend for both purposes.
2. `purpose` is required (as in spec). Breaking for current clients of /auth/resend: they must send `purpose: "ACTIVATE_DISTRIBUTOR"`.
