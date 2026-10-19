# Feature: admin-settings

Admin page `admin/setting`: xem + cập nhật
- số lượt chẩn đoán free / ngày (default 3; thay env DIAGNOSIS_DAILY_LIMIT, không có tier trả phí)
- top articles: số lượng là setting (default 10); admin chọn tối đa N article (có thứ tự) cho mỗi cây trồng
- thông số form chẩn đoán: cây trồng default, số ảnh tối đa (tối thiểu luôn 1), byte tối đa / ảnh, width + height tối đa / ảnh

Ownership: diagnosis settings thuộc `diagnosis` (dùng trong CreateDiagnosis); top articles + limit thuộc `knowledge` (sở hữu articles + crops). Không tạo module mới.

- [x] 1. [domain-model]  diagnosis: DiagnosisSettings (dailyFreeLimit=3, defaultCropType=null, maxImages=5, maxImageBytes=5MB, maxImageWidth=4096, maxImageHeight=4096); error DiagnosisInvalidSettings; Diagnosis.create nhận maxImages thay hằng MAX_DIAGNOSIS_IMAGES
- [ ] 2. [domain-model]  knowledge: TopArticleSettings (limit=10) + CropTopArticles (cropType, articleIds có thứ tự, không trùng, ≤ limit); errors KnowledgeInvalidTopArticleSettings, KnowledgeTopArticlesInvalid
- [ ] 3. [use-case]      diagnosis: GetDiagnosisSettings (admin), UpdateDiagnosisSettings (admin; defaultCropType phải là crop enabled qua IKnowledgeQueryPort), GetDiagnosisFormSettings (user); port IDiagnosisSettingsRepository; CreateDiagnosis đọc settings (limit/ngày, số ảnh, byte, width/height) thay env DIAGNOSIS_DAILY_LIMIT + DIAGNOSIS_MAX_IMAGE_BYTES (bỏ 2 env); IImageProcessor trả width/height gốc để check
- [ ] 4. [use-case]      knowledge: GetTopArticleSettings + UpdateTopArticleSettings (admin, limit), GetCropTopArticles + SetCropTopArticles (admin; article tồn tại, cùng crop, PUBLISHED, ≤ limit), ListTopArticles (public, chỉ PUBLISHED, cắt theo limit); ports ITopArticleSettingsRepository, ICropTopArticlesRepository
- [ ] 5. [persistence]   PgDiagnosisSettingsRepository, table `diagnosis_settings` (1 row; chưa có row = defaults)
- [ ] 6. [persistence]   knowledge: table `knowledge_settings` (1 row, top_articles_limit) + `knowledge_crop_top_articles` (crop_type, position, article_id)
- [ ] 7. [http]          GET/PUT /admin/diagnosis/settings, GET /diagnoses/settings
- [ ] 8. [api-docs]      3 endpoint diagnosis settings
- [ ] 9. [http]          GET/PUT /admin/knowledge/settings (limit), GET/PUT /admin/knowledge/crops/:cropSlug/top-articles, GET /knowledge/articles/top?crop=
- [ ] 10. [api-docs]     5 endpoint knowledge top articles
- [ ] 11. [boundary-review]

Decisions:
- Endpoint public giữ (GET /diagnoses/settings, GET /knowledge/articles/top).
- Ảnh vượt width/height/byte → reject DiagnosisInvalidImage theo index (client resize trước khi gửi); server vẫn normalize long side ≤ 2048 cho AI.
- Giảm limit xuống dưới số article đã chọn của 1 crop → giữ list, public chỉ trả N đầu; PUT list mới phải ≤ limit.
- Article bị unpublish sau khi chọn → public ẩn, admin vẫn thấy (đánh dấu status).
- Bounds: maxImages 1..10, maxImageBytes ≤ 20MB, width/height 256..8192, top articles limit 1..50.
