# Feature: chat message trả thêm username + avatar của sender

Builds on chat-list-room-messages.md, chat-send-message.md. Precedent: chat-room-list-other-user-profile.md.

Flow:
- `GET /chat/rooms/:roomId/messages` → chat.ListRoomMessages (như cũ)
  → distinct senderIds của page → user `IUserQueryPort.listProfilesByIds` (username)
                                 + media `IMediaQueryPort.findThumbnails('USER_AVATAR', ids)` (signed URL)
  → mỗi message thêm `senderUsername` (null nếu user không còn) + `senderAvatar` (signed URL | null).
- Socket `chat.message.received` (push tới receiver từ chat.SendChatMessage)
  → payload thêm `senderUsername` + `senderAvatar` (cùng 2 query port).

Không đổi: ack `chat.message.send` (sender = caller), `GET /chat/rooms` (otherUser đã có profile).
Cả hai query port đã có, ChatModule đã import UserModule + MediaModule → không cần [query-port]. Non-breaking: giữ `senderId`, chỉ thêm field. No event, no migration.

- [x] 1. [use-case]        ListRoomMessages: + IUserQueryPort, IMediaQueryPort → senderUsername, senderAvatar
- [x] 2. [use-case]        SendChatMessage: realtime payload `chat.message.received` + senderUsername, senderAvatar
- [ ] 3. [http]            GET /chat/rooms/:roomId/messages: response + e2e
- [ ] 4. [api-docs]        GET /chat/rooms/:roomId/messages
- [ ] 5. [boundary-review]
