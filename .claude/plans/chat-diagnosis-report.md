# Feature: Chat — gửi diagnosis report (spec 19102026)

Source: Specs/19102026 farmer.md (nút "gửi report" → chọn chat → gửi report theo mẫu); quyết định B1 (đọc report qua chat, chỉ chiều chat → diagnosis).

Flow gửi: socket `chat.message.send { roomId?, receiverId?, message, type?: TEXT|DIAGNOSIS_REPORT, diagnosisId? }`
  → chat.SendChatMessage
  type DIAGNOSIS_REPORT: sender ≠ FARMER → CHAT_DIAGNOSIS_REPORT_NOT_ALLOWED;
    IDiagnosisQueryPort.findOwnership(diagnosisId): null hoặc owner ≠ sender → CHAT_DIAGNOSIS_NOT_FOUND;
    status ≠ COMPLETED → CHAT_DIAGNOSIS_NOT_COMPLETED
  → lưu message (type, diagnosisId) → realtime `chat.message.received` kèm type, diagnosisId
Flow đọc: GET /chat/rooms/{roomId}/messages/{messageId}/diagnosis
  → chat.GetMessageDiagnosisReport: room không có → CHAT_ROOM_NOT_FOUND; caller không phải member → CHAT_NOT_ROOM_MEMBER;
    message không thuộc room → CHAT_MESSAGE_NOT_FOUND; type ≠ DIAGNOSIS_REPORT → CHAT_MESSAGE_NOT_DIAGNOSIS_REPORT
  → IDiagnosisQueryPort.getReport(diagnosisId) (cùng shape GET /diagnoses/:id) ; null → CHAT_DIAGNOSIS_NOT_FOUND

- [x] 1. [query-port]      diagnosis: IDiagnosisQueryPort (DIAGNOSIS_QUERY_PORT) — findOwnership(diagnosisId) → { ownerId, status } | null; getReport(diagnosisId) → TDiagnosisReport | null; export + chat import
- [x] 2. [domain-model]    chat: EChatMessageType TEXT | DIAGNOSIS_REPORT; ChatMessage thêm type + diagnosisId (DIAGNOSIS_REPORT ⇔ có diagnosisId); errors CHAT_INVALID_DIAGNOSIS_REFERENCE (VALIDATION — thêm khi implement: REPORT thiếu diagnosisId / TEXT có diagnosisId), CHAT_DIAGNOSIS_REPORT_NOT_ALLOWED (FORBIDDEN), CHAT_DIAGNOSIS_NOT_FOUND (NOT_FOUND), CHAT_DIAGNOSIS_NOT_COMPLETED (CONFLICT), CHAT_MESSAGE_NOT_FOUND (NOT_FOUND), CHAT_MESSAGE_NOT_DIAGNOSIS_REPORT (BAD_REQUEST)
- [x] 3. [use-case]        SendChatMessage: nhận type + diagnosisId, check qua IDiagnosisQueryPort; realtime payload thêm type, diagnosisId
- [x] 4. [use-case]        ListRoomMessages + ListMyChatRooms (lastMessage): output thêm type, diagnosisId
- [x] 5. [use-case]        GetMessageDiagnosisReport; port IChatMessageRepository.findById
- [x] 6. [persistence]     chat_messages: cột type (default TEXT), diagnosis_id nullable; findById; migration
- [x] 7. [http]            WS `chat.message.send` DTO thêm type?, diagnosisId?; GET /chat/rooms/{roomId}/messages/{messageId}/diagnosis; response messages/rooms thêm type, diagnosisId; e2e
- [x] 8. [api-docs]        GET /chat/rooms/{roomId}/messages/{messageId}/diagnosis + field mới
- [x] 9. [boundary-review]

## Decisions (defaults — đổi nếu sai)
- [query-port] đặt đầu: chat use case cần contract của diagnosis trước (provider module khác).
- `message` vẫn bắt buộc với DIAGNOSIS_REPORT (text theo mẫu do FE soạn, dùng cho preview).
- Report đọc live (không snapshot): diagnosis đổi feedback thì người nhận thấy bản mới.
- Quyền đọc gắn với message: chỉ 2 member của room; người nhận không đọc được các diagnosis khác của farmer.
- getReport dùng chung logic dựng output với GetDiagnosis (signed URL ảnh), không check owner.
- Implement: tách DiagnosisReportBuilder (dùng chung GetDiagnosis + DiagnosisQueryService); migration `1792463518949-chat-message-type`.
