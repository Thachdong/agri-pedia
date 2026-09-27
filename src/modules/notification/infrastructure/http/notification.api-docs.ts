import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { NotificationController } from './notification.controller';

defineApiDocs(NotificationController, {
  tag: 'Notification',
  operations: {
    listMine: {
      summary: "List the caller's notifications",
      description:
        'Any logged-in user. Returns only notifications addressed to the caller (read and unread), newest first. ' +
        '`limit` 1..50, default 20. To get the next page pass the returned `nextCursor` as `cursor`; ' +
        '`nextCursor` is null on the last page. For type REVIEW, `referenceId` is the review id.',
      validation: true,
      auth: true,
      errors: [
        {
          type: EDomainErrorType.VALIDATION,
          code: 'NOTIFICATION_INVALID_CURSOR',
        },
      ],
    },
    markAllRead: {
      summary: "Mark all of the caller's notifications as read",
      description:
        'Marks every unread notification of the caller as read. Empty body on success; ' +
        'also 200 when there is nothing to mark.',
      auth: true,
    },
    markRead: {
      summary: "Mark one of the caller's notifications as read",
      description:
        'Empty body on success; already read → 200, no change. ' +
        'A notification of another user → 404, same as a missing one.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'NOTIFICATION_NOT_FOUND' },
      ],
    },
  },
});
