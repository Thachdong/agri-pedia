# Feature: Get messages of a chat room (FARMER | DISTRIBUTOR)

Source: specs/api.md action 17 (get message).

Flow: `GET /chat/rooms/:roomId/messages?cursor&limit` (AccessTokenGuard) → chat.ListRoomMessages
  (find room; not found → CHAT_ROOM_NOT_FOUND; caller not member → CHAT_NOT_ROOM_MEMBER;
   messages of room, createdAt desc then id desc, keyset cursor (opaque, như GET /chat/rooms); bad cursor → CHAT_INVALID_CURSOR;
   return { messages: [{ id, senderId, message, createdAt }], nextCursor }).
Read-only, không đánh dấu đã đọc (việc đó của `chat.room.enter`). No cross-module call, no event.
Domain + exceptions đã có; index `(room_id, created_at)` đã có → không migration.

- [x] 1. [use-case]        ListRoomMessages; IChatMessageRepository + findPageByRoom
- [x] 2. [persistence]     PgChatMessageRepository.findPageByRoom (không migration)
- [x] 3. [http]            GET /chat/rooms/:roomId/messages
- [ ] 4. [api-docs]        GET /chat/rooms/:roomId/messages
- [ ] 5. [boundary-review]
