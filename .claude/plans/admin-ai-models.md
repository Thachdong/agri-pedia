# Feature: admin chọn AI model cho 3 action

Scope: 1 provider (GEMINI), API key vẫn ở env. Model lưu trong settings DB; `null` = dùng model env (default hiện tại).

- [x] 1. [domain-model]  diagnosis `DiagnosisSettings`: thêm `describeModel`, `verifyModel` (nullable, check format model id) + `updateModels()`; lỗi dùng lại `DiagnosisInvalidSettings`
- [x] 2. [domain-model]  product `ProductSuggestionSettings`: thêm `model` (nullable, check format) + `updateModel()`; lỗi dùng lại `InvalidSuggestionSettings`
- [x] 3. [use-case]      diagnosis `GetDiagnosisAiModels`, `UpdateDiagnosisAiModels` (admin); `CreateDiagnosis` + `ProcessDiagnosis` lấy model từ settings ?? env, truyền vào `IVisionDiagnosisProvider` (`info`/`describe`/`verify` nhận model thay vì tự đọc config)
- [x] 4. [use-case]      product `GetProductSuggestionAiModel`, `UpdateProductSuggestionAiModel` (admin); `SuggestProduct` truyền model vào `IProductNameReader.read`
- [ ] 5. [persistence]   cột `describe_model`, `verify_model` (diagnosis_settings), `model` (product_suggestion_settings): orm-entity, mapper, migration
- [ ] 6. [http]          GET/PUT `/admin/diagnosis/ai-models`
- [ ] 7. [api-docs]      GET/PUT `/admin/diagnosis/ai-models`
- [ ] 8. [http]          GET/PUT `/admin/product-suggestion/ai-model`
- [ ] 9. [api-docs]      GET/PUT `/admin/product-suggestion/ai-model`
- [ ] 10. [boundary-review]

Response GET: giá trị đã lưu (null = chưa set) + model đang hiệu lực (env nếu null). PUT `null` = reset về env.

Notes:
- Endpoint riêng, không nhét vào PUT `/settings` hiện tại (PUT đó replace-all → admin FE cũ sẽ vỡ nếu thêm field bắt buộc).
- Model id chỉ check format, không gọi thử Gemini khi lưu. Model sai → diagnosis/suggestion fail như lỗi AI hiện tại.
- `CreateDiagnosis` ghi `diagnosis.model`, `ProcessDiagnosis` đọc settings lại lúc chạy → admin đổi model đúng lúc giữa 2 bước thì record lệch model thật (cửa sổ vài giây, chấp nhận).
