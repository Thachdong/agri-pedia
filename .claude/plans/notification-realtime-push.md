# Feature: Realtime push khi có notification mới (vd. FARMER review DISTRIBUTOR)

Nguồn: kiểm tra luồng review → notification: hiện chỉ lưu DB, DISTRIBUTOR phải gọi GET /notifications mới thấy.

Flow: FARMER `POST /reviews` (hoặc `PATCH /reviews/:reviewId`)
  → review.CreateReview / UpdateReview emits `review.review.created` / `review.review.updated` (đã có)
  → notification handler (đã có) → notification.CreateNotification
  → lưu notification trong transaction (đã có)
  → SAU commit: IRealtimePublisher.emitToUser(userId, `notification.created`, { id, type, label, content, isRead, referenceId, createdAt })
  → DISTRIBUTOR đang kết nối socket (bất kỳ thiết bị nào) nhận event; offline thì bỏ qua (vẫn thấy qua GET /notifications)

- [x] 1. [use-case]           CreateNotification (sửa): sau commit push `notification.created` tới người nhận qua IRealtimePublisher (đã có trong @shared/realtime)
- [x] 2. [http]               e2e socket: FARMER review DISTRIBUTOR (tạo + sửa review) → DISTRIBUTOR online nhận `notification.created`; user khác không nhận (không có endpoint mới)
- [x] 3. [api-docs]           GET /notifications: bổ sung description về event realtime `notification.created`
- [x] 4. [boundary-review]

## Quyết định (mặc định — sửa nếu sai)
- Push nằm trong CreateNotification ⇒ mọi loại notification (REVIEW, PLATFORM, sau này) đều được push, không riêng review.
- Payload giống 1 item của GET /notifications (createdAt dạng ISO string), để client dùng chung model.
- Best-effort: người nhận offline ⇒ không gửi lại; không lưu hàng đợi.
- Không cần enter phòng: socket đã join room `user:<id>` khi connect.
- Không push số notification chưa đọc (client tự +1 hoặc gọi lại API).

## Open questions
- none
