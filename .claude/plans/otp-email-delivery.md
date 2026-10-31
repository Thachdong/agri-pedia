# Feature: gửi OTP qua email thật (phone làm sau)

Hiện trạng: OTP module (`IssueOtp`, `ResendOtp`, `RequestPasswordResetOtp`) đã gửi qua `IMessageSender` (`MESSAGE_SENDER`); adapter duy nhất là `LogMessageSender` (chỉ ghi log). Không đổi OTP module, chỉ thay adapter trong `src/shared/messaging/`.

- [x] 1. [config-group]   group `mail`: transport (SMTP | LOG), SMTP host/port/secure/user/password, from address; `.env.example`
- [x] 2. [shared-wrapper] messaging: `SmtpEmailSender` (nodemailer) cho EMAIL; router theo channel: EMAIL → SMTP (hoặc log khi transport=LOG), PHONE → `LogMessageSender`; bind `MESSAGE_SENDER`; unit tests
- [x] 3. [boundary-review]

Decisions (approved):
- Provider: SMTP qua nodemailer
- Dev/test: `MAIL_TRANSPORT=LOG` (default) = log-only
- Body: plain text
