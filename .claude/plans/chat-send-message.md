# Feature: Chat — send message (FARMER <-> DISTRIBUTOR, websocket)

Source: specs/api.md §16 chat (send message); entities §5 Chat message, §6 Chat room.

Flow: socket.io connect `auth: { token: <accessToken> }` (handshake verified by IAccessTokenService, invalid → disconnect; socket joins private room `user:<userId>`)
  → client emits `chat.message.send { roomId?, receiverId?, message }` with ack
  → chat.SendChatMessage({ senderId, roomId?, receiverId?, message })
  (neither roomId nor receiverId → CHAT_ROOM_OR_RECEIVER_REQUIRED;
   sender via user query port findRoleById: missing / not ACTIVE → CHAT_SENDER_NOT_ALLOWED;
   roomId   → find room: missing → CHAT_ROOM_NOT_FOUND; sender not member → CHAT_NOT_ROOM_MEMBER;
   receiverId → receiver = sender → CHAT_INVALID_RECEIVER; findRoleById(receiverId): missing → CHAT_RECEIVER_NOT_FOUND;
                not ACTIVE or same role as sender (must be FARMER<->DISTRIBUTOR) → CHAT_INVALID_RECEIVER;
                find room by pair (either order) or create { firstUserId: senderId, secondUserId: receiverId };
   save ChatMessage in transaction)
  → after commit: IRealtimePublisher.emitToUser(otherMemberId, `chat.message.received`, { messageId, roomId, senderId, message, createdAt })
  → ack { messageId, roomId, createdAt }  (errors → ack { error: { code, message } })

- [x] 1. [shared-wrapper]     `realtime`: wrap @nestjs/websockets + socket.io — handshake auth via access token, per-user socket room, IRealtimePublisher (REALTIME_PUBLISHER).emitToUser; WS DomainException filter + validation for inbound gateways
- [x] 2. [module-scaffold]    module `chat`
- [x] 3. [domain-model]       ChatRoom (two distinct members, otherMember — throws CHAT_NOT_ROOM_MEMBER), ChatMessage (message trimmed 1..2000); errors CHAT_INVALID_MESSAGE, CHAT_ROOM_OR_RECEIVER_REQUIRED, CHAT_SENDER_NOT_ALLOWED (FORBIDDEN), CHAT_ROOM_NOT_FOUND (NOT_FOUND), CHAT_NOT_ROOM_MEMBER (FORBIDDEN), CHAT_RECEIVER_NOT_FOUND (NOT_FOUND), CHAT_INVALID_RECEIVER
- [ ] 4. [use-case]           SendChatMessage, ports IChatRoomRepository (findById, findByMembers, save) + IChatMessageRepository (save); uses IUserQueryPort.findRoleById (exists) + IRealtimePublisher
- [ ] 5. [persistence]        PgChatRoomRepository, PgChatMessageRepository; tables `chat_rooms` (unique pair regardless of order), `chat_messages` (index room_id + created_at)
- [ ] 6. [http]               WS gateway (namespace `/chat`): `chat.message.send` (ack) — inbound adapter, e2e with socket.io-client
- [ ] 7. [boundary-review]

No [api-docs] step: Swagger does not describe websocket events. Event contract documented in gateway file comment.
No integration event: realtime push stays inside chat module via shared IRealtimePublisher (no other module reacts).

## Decisions (defaults — change if wrong)
- Transport: send over websocket event with ack (no HTTP POST). Library socket.io (@nestjs/platform-socket.io).
- Token passed in handshake `auth.token` (fallback `Authorization: Bearer` header); verified once at connect.
- Both roles may send; pair must be one FARMER + one DISTRIBUTOR, both ACTIVE (receiver checked only when creating/finding by receiverId; roomId path trusts room membership).
- One room per pair: use-case lookup + DB unique index on (LEAST, GREATEST) of member ids; race on insert → repository reloads existing room.
- Realtime push is best-effort: receiver offline → nothing (message still stored; fetched later via §17).
- Sender's other open sockets do not get the push (only receiver). 
- Message length 1..2000 chars (trimmed).

## Open questions
- Transport OK (WS send + ack), or want also HTTP `POST /chat/messages` with WS used only for push?
