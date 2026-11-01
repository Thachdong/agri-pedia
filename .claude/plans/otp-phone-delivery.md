# Feature: gửi OTP qua SMS bằng SpeedSMS (không brandname)

Hiện trạng: `MESSAGE_SENDER` = `ChannelMessageSender`; PHONE → `LogMessageSender` (log-only). OTP module không đổi.

Quyết định: SpeedSMS, `type=2` (đầu số ngẫu nhiên, theo docs chính thức), sender rỗng = gửi từ đầu số ngẫu nhiên, chưa cần brandname. Body plain text như hiện tại (đã có chữ "AgriPedia"). Gọi REST bằng `fetch`, không thêm package.
Chỉ cho đăng ký số Viettel / Mobifone / Vinaphone, kiểm tra theo đầu số ở HTTP DTO đăng ký (số đã chuyển mạng giữ số có thể bị nhận sai nhà mạng: chấp nhận).

- [x] 1. [config-group]   group `sms`: transport (LOG | SPEEDSMS, default LOG), SpeedSMS access token; `.env.example`
- [x] 2. [shared-wrapper] messaging: `SpeedSmsSender` cho PHONE (số chuẩn hóa về `84...`); router PHONE → SpeedSMS khi transport=SPEEDSMS, else log; unit tests
- [ ] 3. [http]           user: `POST` đăng ký với loginType PHONE chỉ nhận đầu số Viettel / Mobifone / Vinaphone; e2e
- [ ] 4. [api-docs]       mô tả ràng buộc nhà mạng của endpoint đăng ký
- [ ] 5. [boundary-review]
