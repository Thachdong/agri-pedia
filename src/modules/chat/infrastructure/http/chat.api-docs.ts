import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ChatController } from './chat.controller';

defineApiDocs(ChatController, {
  tag: 'Chat',
  operations: {
    listMyRooms: {
      summary: "List the caller's chat rooms with unread counts",
      description:
        'Any logged-in user. Rooms the caller is a member of, most recent message first ' +
        '(`lastMessageAt` desc). Each room carries the other member: `otherUserId`, `otherUsername` ' +
        '(null if that user no longer exists) and `otherUserAvatar` (signed read URL that expires; null when none). ' +
        '`unreadCount` = messages from the other member not read by the caller; ' +
        'a message is read when it arrives while the caller has the room open (socket `chat.room.enter`), ' +
        'or once the caller enters the room later. The caller’s own messages never count. ' +
        '`totalUnread` covers all rooms, not only this page. `limit` 1..50, default 20; ' +
        'pass the returned `nextCursor` as `cursor` for the next page (null on the last page).',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'CHAT_INVALID_CURSOR' },
      ],
    },
    listMessages: {
      summary: 'List the messages of a chat room',
      description:
        'Caller must be a member of the room. Newest message first (`createdAt` desc); ' +
        '`limit` 1..50, default 20; pass the returned `nextCursor` as `cursor` to get older messages ' +
        "(null on the last page). Each message carries its sender's `senderUsername` (null when the user " +
        'no longer exists) and `senderAvatar` (signed read URL that expires; null when none). ' +
        'Read-only: does not mark messages read (socket `chat.room.enter` does). ' +
        'New messages arrive live through socket `chat.message.received` (same sender fields).',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'CHAT_INVALID_CURSOR' },
        { type: EDomainErrorType.FORBIDDEN, code: 'CHAT_NOT_ROOM_MEMBER' },
        { type: EDomainErrorType.NOT_FOUND, code: 'CHAT_ROOM_NOT_FOUND' },
      ],
    },
  },
});
