Feature: Chẩn đoán nhiều loại cây trồng (spec: specs/multi-crop-diagnosis-plan.md; cây thứ 2 = DURIAN, seed nhưng `enabled = false`)

Flow: seed `seed/crops/<CROP>/` (crop.json + diseases.json + profile.json + scenarios.json) → bảng `crops` (config jsonb, kb_version) → knowledge.findDiagnosisCrop trả cấu hình cây → diagnosis dựng schema/prompt B1, B3 theo cây → B2/B4 như cũ. Lúa giữ nguyên kết quả B2.

Ngoài phạm vi: client (client chỉ gửi mã cây `cropType`, đã có trong API).

## Shared + config
- [x] 1. [config-group]       `knowledge` (KNOWLEDGE_ENABLED_CROPS: danh sách mã, rỗng = theo crop.json)

## Module knowledge
- [x] 2. [domain-model]       bỏ hằng OBSERVATION_FEATURES → type TObservationFeatures theo cây (level, values, normal, descriptionEn, hintsEn); Crop thêm nameEn, kbVersion, sortOrder, plantParts, cropStages, features, prompt; mở rộng EPlantPart / ECropStage / EAgentType (OOMYCETE, ALGA) / EVerification (SECONDARY, vẫn làm ứng viên)
- [x] 3. [use-case]           SeedKnowledgeBase: snapshot nhiều cây (kbVersion theo cây), KNOWLEDGE_ENABLED_CROPS ghi đè enabled; ListCrops trả plantParts/cropStages, sắp theo sortOrder
- [x] 4. [persistence]        migration `knowledge-crops-config` (crops: name_en, kb_version, sort_order, config jsonb); mapper; replaceKnowledgeBase tắt cây không còn trong seed
- [x] 5. [persistence]        seed loader JsonKnowledgeBaseSource đọc `seed/crops/*/` + các kiểm tra mục 4.3; crop pack RICE (crop.json mới, chuyển diseases/profile, profile thêm normal/descriptionEn/hintsEn chuyển từ prompt B1, scenarios.json); đổi specs/profile.json → specs/profiles/RICE.json; test "lúa không đổi điểm B2" + golden test theo cây
- [x] 6. [query-port]         IKnowledgeQueryPort.findDiagnosisCrop trả nameEn, plantParts, features, prompt; TKnowledgePlantPart → string; bỏ KNOWLEDGE_OBSERVATION_FEATURES

## Module diagnosis
- [x] 7. [domain-model]       EPlantPart mở rộng (giống knowledge); isWholeImageAbnormal / wholeImageRegion theo `features` của cây (`normal`), lúa cho kết quả như cũ
- [x] 8. [use-case]           CreateDiagnosis: plantPart phải thuộc crop.plantParts (DIAGNOSIS_INVALID_IMAGE), promptVersion `d2+v2/<CROP>@<kbVersion>`; ProcessDiagnosis: lấy cấu hình cây 1 lần / ca, detectedPart theo crop.plantParts, truyền crop vào TDescribeInput / TVerifyInput
- [x] 9. [adapter]            AiVisionProvider: buildDescribeOutputSchema(crop) cache theo cropType@kbVersion; prompt B1/B3 template chung (d2/v2) sinh phần riêng từ crop + features (không có skill riêng — làm theo quy ước infrastructure)

## Sầu riêng (dữ liệu)
- [x] 10. [seed-data]         crop pack DURIAN (`enabled: false`): diseases.json từ Design/desease-detection/Duriant-KB, profile-durian.json + normal/descriptionEn/hintsEn, crop.json, scenarios.json (22 tình huống); đổi specs/profile-durian*.json → specs/profiles/DURIAN*.json

## HTTP + docs
- [x] 11. [http]              GET /knowledge/crops thêm plantParts/cropStages; e2e: crops trả plantParts, POST /diagnoses DURIAN (tắt) → DIAGNOSIS_CROP_NOT_SUPPORTED, plantPart ngoài cây → DIAGNOSIS_INVALID_IMAGE
- [x] 12. [api-docs]          GET /knowledge/crops, POST /diagnoses (lỗi plantPart); openapi:export; cập nhật specs api.md, entities.md, disease-diagnoses-plan.md 4.1/4.2/8

- [ ] 13. [boundary-review]
