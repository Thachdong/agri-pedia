# Feature: GET /chat/rooms trả thêm username + avatar của otherUser

Source: specs/api.md action 18 (get chat rooms). Builds on chat-room-list-unread.md.

Flow: `GET /chat/rooms` → chat.ListMyChatRooms (như cũ)
  → otherUserIds của page → user `IUserQueryPort.listProfilesByIds` (username)
                          + media `IMediaQueryPort.findThumbnails('USER_AVATAR', ids)` (signed URL)
  → mỗi room thêm `otherUsername` (null nếu user không còn) + `otherUserAvatar` (signed URL | null).
Giống precedent review.ListDistributorReviews. Cả hai query port đã có → không cần [query-port] provider; chat module import thêm MediaModule.
Non-breaking: giữ `otherUserId`, chỉ thêm field. No event, no migration.

- [x] 1. [use-case]        ListMyChatRooms: + IUserQueryPort, IMediaQueryPort → otherUsername, otherUserAvatar
- [x] 2. [http]            GET /chat/rooms: response + e2e
- [ ] 3. [api-docs]        GET /chat/rooms
- [ ] 4. [boundary-review]
