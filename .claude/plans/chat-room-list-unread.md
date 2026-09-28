# Feature: Chat rooms list + unread count (logged-in user)

Source: request "lấy số tin nhắn chưa đọc và danh sách tin nhắn sort theo last message mới nhất"; specs/api.md §18 get chat rooms (server-side sort overrides spec note "client tự sort").
Answers: read state = per-room read marker; list = chat rooms; unread = total + per room;
read rule = message is read if receiver has that room's chat window open (entered), unread otherwise; no HTTP mark-read (WS enter only).

Flow A — list: `GET /chat/rooms?cursor&limit` + Bearer (chat module)
  → AccessTokenGuard (401) → chat.ListMyChatRooms({ userId, cursor?, limit })
  (bad cursor → 400 CHAT_INVALID_CURSOR;
   rooms where user is member, order lastMessageAt desc, id desc, keyset paginated;
   each room: last message + unreadCount = other member's messages newer than my read marker;
   totalUnread = same count over all my rooms)
  → 200 { totalUnread, rooms: [{ roomId, otherUserId, lastMessage: { messageId, senderId, message }, lastMessageAt, unreadCount }], nextCursor }

Flow B — open window: socket emits `chat.room.enter { roomId }` (ack)
  → chat.EnterChatRoom({ userId, roomId, connectionId })
  (missing → CHAT_ROOM_NOT_FOUND; not member → CHAT_NOT_ROOM_MEMBER;
   connection joins presence channel of the room, then my marker = now)
  → ack null
Flow C — close window: socket emits `chat.room.leave { roomId }` (ack) → chat.LeaveChatRoom → connection leaves channel. Socket disconnect leaves all channels automatically.

Change to existing flow — SendChatMessage (in transaction):
  room records the message (lastMessageAt = message.createdAt, sender's marker = message.createdAt);
  receiver currently in the room's channel (any of their connections) → receiver's marker = message.createdAt too (read, not counted);
  room saved.

- [x] 1. [shared-wrapper]     realtime (change): channel presence — IRealtimeChannels (REALTIME_CHANNELS): join(connectionId, channel), leave(connectionId, channel), hasUser(channel, userId); @SocketConnectionId() for gateways
- [x] 2. [domain-model]       ChatRoom: lastMessageAt, per-member lastReadAt (null = never read); recordMessage(message), markReadBy(userId, at), lastReadAtOf(userId); error CHAT_INVALID_CURSOR (VALIDATION)
- [x] 3. [use-case]           SendChatMessage (change): record message on room, mark receiver read if present in room channel, IChatRoomRepository.save(room)
- [x] 4. [use-case]           ListMyChatRooms, ports IChatRoomRepository.findPageByMember(userId, { after, limit }) → room summaries + countUnreadByMember(userId)
- [x] 5. [use-case]           EnterChatRoom (member check, join channel, mark read now, save) + LeaveChatRoom (leave channel)
- [x] 6. [persistence]        chat_rooms add last_message_at, first_user_last_read_at, second_user_last_read_at (backfill last_message_at from messages); indexes rooms by member + last_message_at, chat_messages (room_id, created_at); implement new repo methods; save() writes timestamps with GREATEST(stored, new) so concurrent Send/Enter never lose a newer value
- [x] 7. [http]               GET /chat/rooms (guarded)
- [ ] 8. [api-docs]           GET /chat/rooms (auth: true)
- [ ] 9. [http]               ChatGateway: `chat.room.enter`, `chat.room.leave` (ack), e2e incl. "receiver in room → unreadCount 0", "receiver not in room / disconnected → counted"
- [ ] 10. [boundary-review]

## Decisions (defaults — change if wrong)
- "Viewing" = at least one of the receiver's connections entered the room and has not left/disconnected (multi-device: any one counts).
- Enter joins the channel BEFORE setting the marker, so a message arriving in between is not lost as unread.
- Presence is in-process (socket.io local adapter): single server instance. Multi-instance would need a socket.io Redis adapter later.
- HTTP for listing; no realtime event when read state changes (no "seen" for sender).
- Any logged-in user (token only, no role lookup): no rooms → `{ totalUnread: 0, rooms: [], nextCursor: null }`.
- Sender's own messages never count as unread.
- Existing rooms after migration: markers null → all messages from the other member count unread.
- Marker never moves backwards.
- limit 1..50, default 20 (same as notifications). Cursor opaque (lastMessageAt + roomId).
- lastMessageAt concurrent sends: repository keeps the later value.
- `otherUserId` only (no profile lookup), as in spec §18.

## Open questions
- none
