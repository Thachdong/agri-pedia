# Risk report

Các rủi ro đã biết và được chấp nhận tạm thời. Mỗi mục ghi: bối cảnh, khi nào xảy ra, hậu quả, hướng xử lý sau này.

---

## R1. Integration event in-memory — product có thể thiếu media

- **Feature:** Create product (`POST /products`) — plan `.claude/plans/product-create.md`
- **Trạng thái:** Chấp nhận tạm thời (2026-09-27)
- **Module liên quan:** `product` (publisher), `media` (subscriber)

### Bối cảnh
`CreateProductUseCase` lưu product trong transaction, sau khi commit mới publish `product.product.created`.
`media` nhận event qua `ProductCreatedHandler` → `ConfirmMediaUseCase` (move file `tmp/{userId}/...` → `products/{productId}/...`, tạo record `media`).
Event bus là in-memory (`@nestjs/event-emitter`): publisher await handler (chạy trong cùng request), lỗi handler bị `@OnIntegrationEvent` catch + log, không propagate. Event không được lưu ở đâu → không retry.

### Khi nào xảy ra
1. **Process Node dừng đột ngột** trong khoảng giữa lúc transaction product commit và lúc handler media chạy xong (thường vài trăm ms):
   - server crash (uncaught error, OOM kill)
   - deploy / restart container giữa request
   - process bị kill (`SIGKILL`), mất điện máy chủ
2. **Lỗi không lường trước trong handler** (vd. lỗi mạng khi gọi Firebase lúc move file): handler log lỗi, request vẫn trả `201`. Khả năng xảy ra cao hơn case 1.

### Hậu quả
- Product đã tồn tại trong DB (`status = ACTIVE`) nhưng thiếu một phần hoặc toàn bộ media.
- File còn nằm trong `tmp/` (sẽ bị cron cleanup TMP xoá khi feature đó có), hoặc đã move sang `products/` nhưng không có record `media` (file mồ côi).
- Client nhận `201 { productId }`, không biết media nào không được gắn.
- Không có cơ chế tự phục hồi: danh sách key media chỉ nằm trong event, mất cùng process.

### Hướng xử lý sau này
- **Outbox pattern:** ghi event vào bảng outbox trong cùng transaction với product; worker đọc outbox, gọi handler, retry khi lỗi, đánh dấu đã xử lý. Chắc chắn nhất; cần thêm bảng, worker, idempotency.
- **Reconcile job:** job định kỳ tìm product không có media / file TMP quá hạn để xử lý lại hoặc dọn. Đơn giản hơn; cần lưu key media của product (hiện chỉ có trong event).
- Liên quan: cron cleanup TMP (specs/api.md §10) sẽ dọn file mồ côi trong `tmp/`, nhưng không gắn lại media cho product.

---

## R2. File mồ côi khi lưu record `media` lỗi sau khi đã move file

- **Feature:** Create product — `ConfirmMediaUseCase` (`src/modules/media/application/use-cases/confirm-media.use-case.ts`)
- **Trạng thái:** Mở — chưa quyết định (2026-09-27)
- **Module liên quan:** `media`, `shared/storage`

### Bối cảnh
`ConfirmMediaUseCase` move từng file `tmp/...` → `products/{productId}/{mediaId}.{ext}` trước, rồi mới lưu tất cả record `media` trong một transaction. Storage (GCS) không tham gia transaction DB, không có rollback phía storage.

### Khi nào xảy ra
Move file thành công nhưng transaction lưu `media` lỗi (DB mất kết nối, timeout, ...), hoặc process dừng giữa move và save.

### Hậu quả
- File nằm trong `products/{productId}/` nhưng không có record `media` trỏ tới → không hiển thị, tốn dung lượng.
- File đã rời `tmp/` → gọi lại `ConfirmMedia` cũng không xử lý được (bị skip vì không tìm thấy file TMP).
- Cron cleanup TMP không dọn được vì file không còn ở `tmp/`.

### Hướng xử lý sau này
- Lưu record `media` trước (trạng thái PENDING), move file, rồi đánh dấu CONFIRMED; job dọn record PENDING quá hạn.
- Hoặc khi transaction lỗi: move ngược file về `tmp/` (best-effort) hoặc xoá file vừa move.
- Hoặc job định kỳ quét `products/` tìm object không có record `media`.

---

## R3. Client không biết media nào bị bỏ qua

- **Feature:** Create product (`POST /products`)
- **Trạng thái:** Mở — chưa quyết định (2026-09-27)
- **Module liên quan:** `product`, `media`

### Bối cảnh
Media lỗi (key của user khác, extension không khớp, file chưa upload lên TMP) bị `ConfirmMediaUseCase` skip + log `warn 'Media file skipped'`. Response chỉ có `201 { productId }`.

### Khi nào xảy ra
Client gửi `media` với key sai / chưa PUT file lên presign URL / extension khác lúc presign.

### Hậu quả
- Product tạo thành công nhưng thiếu ảnh; client tưởng đủ.
- Có thể tạo product không có media nào dù rule yêu cầu ≥ 1 media (rule chỉ kiểm tra ở DTO, không kiểm tra số media thực sự gắn được).

### Hướng xử lý sau này
- Validate media đồng bộ trước khi tạo product (cần query port từ `media`, read-only: kiểm tra key hợp lệ + file tồn tại trong TMP) → trả 400 nếu có media lỗi.
- Hoặc trả thêm danh sách media đã gắn / bị bỏ qua trong response (cần đổi thiết kế: handler không trả kết quả về publisher).
- Hoặc client gọi API xem chi tiết product (action 22) sau khi tạo để kiểm tra.

---

## R4. Giá bị làm tròn 2 chữ số thập phân ở DB

- **Feature:** Create product — cột `products.price`
- **Trạng thái:** Mở — chưa quyết định (2026-09-27)
- **Module liên quan:** `product`

### Bối cảnh
Cột `price` là `numeric(14,2)` (tối đa 999,999,999,999.99). DTO chặn > 2 chữ số thập phân và giá trị vượt max; domain `Product` chỉ kiểm tra `price` hữu hạn và ≥ 0, không giới hạn số thập phân.

### Khi nào xảy ra
Có caller khác ngoài HTTP (use case khác, job, import dữ liệu) tạo `Product` với giá > 2 chữ số thập phân hoặc vượt max.

### Hậu quả
- Postgres làm tròn giá âm thầm (> 2 chữ số thập phân), hoặc lỗi 500 khi vượt max.
- Nếu giá thực tế luôn là VND nguyên, kiểu `numeric` + chuyển đổi string → number là thừa.

### Hướng xử lý sau này
- Chốt nghiệp vụ: giá luôn VND nguyên? → đổi cột sang `bigint`, domain kiểm tra `Number.isInteger(price)`.
- Nếu giữ số thập phân: đưa rule "tối đa 2 chữ số thập phân + max" vào domain `Product` để mọi caller đều bị kiểm tra.

---

## R5. `FirebaseFileStorage.moveFile` chưa test với bucket thật

- **Feature:** `shared/storage` — `src/shared/storage/firebase.storage.ts`
- **Trạng thái:** Mở — cần kiểm chứng (2026-09-27)
- **Module liên quan:** `shared/storage`, `media`

### Bối cảnh
`moveFile` gọi `bucket().file(fromKey).move(toKey)`; lỗi có `code === 404` được đổi thành `StorageFileNotFoundError` (→ `ConfirmMedia` skip file). Unit test và e2e chỉ dùng `InMemoryFileStorage`.

### Khi nào xảy ra
Chạy với Firebase Storage thật, file nguồn không tồn tại trong TMP.

### Hậu quả
Nếu SDK trả lỗi không mang `code === 404` (khác format giả định): lỗi bị coi là unexpected → `ConfirmMedia` vẫn lưu các file khác nhưng throw lỗi → handler log `error` thay vì `warn 'Media file skipped'`. Kết quả nghiệp vụ giống nhau (file bị bỏ qua), chỉ khác mức log — nhưng giả định cần xác nhận.

### Hướng xử lý sau này
- Test thủ công với bucket dev: `POST /products` với key chưa upload → kiểm tra log là `warn 'Media file skipped'`.
- Cân nhắc thêm test tích hợp với Firebase Storage emulator.
