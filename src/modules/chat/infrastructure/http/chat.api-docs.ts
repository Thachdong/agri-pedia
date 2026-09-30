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
        '(`lastMessageAt` desc). `unreadCount` = messages from the other member not read by the caller; ' +
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
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'CHAT_INVALID_CURSOR' },
      ],
    },
  },
});
