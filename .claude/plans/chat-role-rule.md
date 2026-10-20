# Feature: Chat — role rule (spec 19102026)

Source: Specs/19102026 (farmer.md, distributor.md, admin.md). Chỉ FARMER <-> DISTRIBUTOR chat; chỉ FARMER mở room; ADMIN không chat.

Flow: socket `chat.message.send { roomId?, receiverId?, message }` → chat.SendChatMessage
  sender không ACTIVE hoặc role ∉ {FARMER, DISTRIBUTOR} → CHAT_SENDER_NOT_ALLOWED
  receiverId + chưa có room giữa 2 người + sender ≠ FARMER → CHAT_ROOM_OPEN_NOT_ALLOWED
  receiverId + room đã có → distributor được gửi (phản hồi)
  receiver role phải là role đối diện (ADMIN receiver → CHAT_INVALID_RECEIVER)

- [x] 1. [domain-model]    error CHAT_ROOM_OPEN_NOT_ALLOWED (FORBIDDEN)
- [x] 2. [use-case]        SendChatMessage: rule role sender/receiver + chỉ FARMER mở room mới
- [x] 3. [http]            gateway `chat.message.send`: không đổi contract; bổ sung e2e (admin bị chặn, distributor mở room bị chặn, distributor phản hồi được)
- [x] 4. [boundary-review]

No [api-docs]: websocket event, không có Swagger.
