# Feature: Mark notifications as read (one or all)

Source: specs/api.md §20 mark read notification.

Flow (notification module, both guarded → 401 without token):
  `PATCH /notifications/:id/read` → notification.MarkNotificationRead({ userId, notificationId })
    (find by id + userId: missing or someone else's → 404 NOTIFICATION_NOT_FOUND; markRead(); save in transaction)
    → 200 null
  `PATCH /notifications/read-all` → notification.MarkAllNotificationsRead({ userId })
    (one UPDATE: is_read = true where user_id = userId and is_read = false)
    → 200 null

- [x] 1. [domain-model]       notification: Notification.markRead() (idempotent); error NOTIFICATION_NOT_FOUND (NOT_FOUND)
- [x] 2. [use-case]           notification: MarkNotificationRead, port INotificationRepository.findByIdAndUser
- [x] 3. [use-case]           notification: MarkAllNotificationsRead, port INotificationRepository.markAllReadByUser
- [x] 4. [persistence]        notification: PgNotificationRepository.findByIdAndUser, markAllReadByUser (no migration: IDX_notifications_user_created_id covers user_id)
- [x] 5. [http]               PATCH /notifications/:id/read, PATCH /notifications/read-all (guarded)
- [x] 6. [api-docs]           both routes (auth: true)
- [x] 7. [boundary-review]

## Decisions (defaults — change if wrong)
- Two routes, two use cases (one action each) instead of one route with optional `notificationId` (spec §20 input). Same behaviour, clearer REST. (approved)
- Any logged-in user (FARMER | DISTRIBUTOR), no role/status check; userId from token.
- Someone else's notification → 404 (same as missing; does not reveal it exists).
- Already read → 200, no change (idempotent).
- Mark all: bulk UPDATE, not load + save each row. No notifications / all read → 200.
- Response: 200 with empty body (spec: null).
- `:id` validated as uuid (ParseUUIDPipe) → 400.

## Open questions
- none (answered: two PATCH routes approved)
