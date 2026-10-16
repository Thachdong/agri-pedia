Feature: Chẩn đoán bệnh cây trồng (spec: specs/disease-diagnoses-plan.md, api.md 33~39, entities.md 14~17)

Flow: POST /diagnoses → CreateDiagnosis (202) → ProcessDiagnosis nền (B1 Gemini describe → B2 knowledge.findCandidates → B3 Gemini verify → B4) → upload ảnh → emits `diagnosis.images.stored` → media handles → RegisterStoredMedia; realtime `diagnosis.completed`

## Shared + config
- [x] 1. [config-group]       `diagnosis` (PROVIDER, API_KEY, DESCRIBE_MODEL, VERIFY_MODEL, TIMEOUT_MS, CONCURRENCY, MAX_IMAGE_BYTES, MAX_REGIONS_PER_IMAGE, CANDIDATES_PER_REGION, DAILY_LIMIT)
- [x] 2. [shared-wrapper]     `shared/storage`: thêm `uploadFile(key, buffer, contentType)` vào IFileStorage
- [x] 3. [shared-wrapper]     `shared/ai`: bọc Vercel AI SDK (`ai` + `@ai-sdk/google`) → IAiClientFactory (AI_CLIENT_FACTORY): create({ provider, apiKey }) → IAiClient.generateObject (model, system prompt, parts text/ảnh, zod schema, temperature, timeout). Thêm provider khác = thêm `@ai-sdk/<x>` + 1 nhánh trong factory

## Module knowledge (mới)
- [x] 4. [module-scaffold]    module `knowledge`
- [x] 5. [domain-model]       Crop, Disease (profile + variants), enums (category, agentType, plantPart, verification, feature enums); hàm thuần chấm điểm B2 (profile → raw → softmax top-N); errors KnowledgeCropNotFound, KnowledgeDiseaseNotFound
- [x] 6. [use-case]           SeedKnowledgeBase (idempotent upsert, check kbVersion profile = diseases), ListCrops, ListDiseases, GetDiseaseDetail; port IKnowledgeRepository
- [x] 7. [persistence]        PgKnowledgeRepository, bảng `crops`, `diseases`; copy seed JSON vào `infrastructure/seed/`; seed chạy lúc app khởi động
- [x] 8. [query-port]         IKnowledgeQueryPort: findDiagnosisCrop (enabled + kbVersion), findCandidates, getDiseaseCards, getDiseaseNames; export feature enums trong contracts (nguồn cho zod schema B1)
- [x] 9. [http]               GET /knowledge/crops, GET /knowledge/diseases, GET /knowledge/diseases/:code
- [x] 10. [api-docs]          3 endpoint knowledge

## Module media (sửa)
- [x] 11. [domain-model]      EMediaOwnerType.DIAGNOSIS, folder `diagnoses`
- [x] 12. [use-case]          RegisterStoredMedia (tạo Media cho file đã có, không move)
- [x] 13. [query-port]        findUrls + findThumbnails nhận `DIAGNOSIS`

## Module diagnosis (mới)
- [x] 14. [module-scaffold]   module `diagnosis`
- [x] 15. [domain-model]      aggregate Diagnosis + DiagnosisImage; enums status/imageStatus/plantPart/feedback/confidenceLevel; hàm thuần: lọc vùng B1, confidence + gộp B4 (vùng → ảnh → summary); errors DiagnosisUserNotAllowed, DiagnosisCropNotSupported, DiagnosisInvalidImage, DiagnosisDailyLimitExceeded, DiagnosisNotFound, DiagnosisNotCompleted, DiagnosisInvalidCursor, DiagnosisNotProcessing (thêm: chặn ghi kết quả khi ca đã COMPLETED/FAILED, vd bị FailStale đánh FAILED)
- [x] 16. [use-case]          CreateDiagnosis (validate, normalize, limit, lưu PROCESSING, kick nền); ports IDiagnosisRepository, IImageProcessor, IDiagnosisJobRunner (chạy nền), IVisionDiagnosisProvider.info (provider/model/promptVersion); dùng IUserQueryPort, IKnowledgeQueryPort
- [x] 17. [use-case]          ProcessDiagnosis (B1~B4 song song theo ảnh, retry 1 lần, upload ảnh, COMPLETED/FAILED, realtime `diagnosis.completed`); port IVisionDiagnosisProvider (FakeVisionProvider)
- [x] 18. [use-case]          GetDiagnosis, ListMyDiagnoses, SubmitDiagnosisFeedback, FailStaleDiagnoses (lúc khởi động)
- [x] 19. [persistence]       PgDiagnosisRepository, bảng `diagnoses`, `diagnosis_images`
- [x] 20. [outbound-adapter]  SharpImageProcessor (normalize/crop/thumbnail) + AiVisionProvider (dùng IAiClientFactory với DIAGNOSIS_PROVIDER/API_KEY, model riêng B1/B3, prompts d1/v1, zod schema, giới hạn CONCURRENCY) — không có skill riêng, theo quy ước hex-persistence-adapter
- [x] 21. [integration-event] ProcessDiagnosis emits `diagnosis.images.stored`
- [x] 22. [event-handler]     media: `diagnosis.images.stored` → RegisterStoredMedia
- [x] 23. [http]              POST /diagnoses (multipart), GET /diagnoses/:diagnosisId, GET /diagnoses, POST /diagnoses/:diagnosisId/feedback
- [x] 24. [api-docs]          4 endpoint diagnosis
- [x] 25. [boundary-review]

## Package mới
`ai` v6 + `@ai-sdk/google` v3 (v7 chỉ có ESM, Jest/CJS không load được; peer zod ^3.25.76 khớp project), `sharp`, `@types/multer` (dev). AI SDK nhận zod schema trực tiếp cho structured output.

## Quyết định
- Provider SDK: Vercel AI SDK (đa provider: Google, OpenAI, Anthropic, xAI...); giai đoạn 1 chỉ cài `@ai-sdk/google`.
- Model theo bước: `DIAGNOSIS_DESCRIBE_MODEL` (B1), `DIAGNOSIS_VERIFY_MODEL` (B3), nhập từ .env; `Diagnosis.model` = `"<describe>+<verify>"`.
- Key: `DIAGNOSIS_API_KEY` (dev tự quản lý .env), 1 key cho provider đang chọn.
- Seed KB: chạy lúc app khởi động, luôn upsert theo code (51 dòng, rẻ; profile.json đổi trọng số mà không đổi kbVersion vẫn được nạp), xoá mục đã bị bỏ khỏi KB.
- Model mặc định B1 + B3: `gemini-3-flash-preview`. Smoke test thật (13/10): `gemini-2.5-flash` bị Gemini API từ chối với key mới ("no longer available to new users"); đổi qua `DIAGNOSIS_*_MODEL` trong .env.
- Box B1: model trả `box_2d` [ymin,xmin,ymax,xmax] 0..1000 (chuẩn Gemini), adapter đổi sang {x,y,w,h} 0..1.
