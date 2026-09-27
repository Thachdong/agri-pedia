# Feature: List my notifications

Source: specs/api.md §19 get notification; entities §4 Notification.

Flow: `GET /notifications?cursor=<opaque>&limit=<1..50, default 20>` + `Authorization: Bearer <accessToken>` (notification module)
  → AccessTokenGuard (401) → notification.ListMyNotifications({ userId, cursor?, limit })
  (bad cursor → 400 NOTIFICATION_INVALID_CURSOR;
   notifications where user_id = userId, order by created_at desc, id desc, keyset page of limit + 1)
  → 200 { notifications: [{ id, type, label, content, isRead, referenceId, createdAt }], nextCursor: string | null }

- [x] 1. [domain-model]       notification: error NOTIFICATION_INVALID_CURSOR (VALIDATION)
- [x] 2. [use-case]           notification: ListMyNotifications, port INotificationRepository.findByUser(userId, { after?, limit }); cursor encode/decode
- [x] 3. [persistence]        notification: PgNotificationRepository.findByUser (keyset) + index (user_id, created_at, id) + migration
- [ ] 4. [http]               GET /notifications?cursor&limit (guarded)
- [ ] 5. [api-docs]           GET /notifications (auth: true)
- [ ] 6. [boundary-review]

## Decisions (defaults — change if wrong)
- Any logged-in user (FARMER | DISTRIBUTOR), no role/status check: a user only ever sees their own rows (userId from token).
- Read and unread both returned; no filter.
- limit: integer 1..50, default 20. Cursor: opaque base64url of `{ createdAt, id }` of the last item (same format as GET /products); malformed → 400.
- No realtime push (decided: REST first; realtime later together with chat §16).
- Review plan (`review-create.md`, steps 9–13) paused; resumed after this feature. Until then no REVIEW notification rows are created, so the list is empty unless rows are inserted by hand.

## Open questions
- none
