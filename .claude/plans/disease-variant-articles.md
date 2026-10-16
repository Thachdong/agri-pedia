Feature: Bài viết cho biến thể bệnh (spec: specs/disease-articles-plan.md mục 4, 5.2, 7, 9; api.md action 35, 41, 42; Design article-plan.md mục 3.3)

Flow: crop pack `articles/RICE_BLAST__V1.md` (code = id biến thể) → FileArticleSource chấp nhận id biến thể → Article { diseaseCode = mã bệnh cha, variantCode } → bảng `articles.variant_code` → API: link `/diseases/<id biến thể>` trỏ bài biến thể (chưa có bài riêng → bài chính), action 42 thêm variant / parentArticle / variantArticles, action 41 thêm variant, action 35 variants[].article; revalidate thêm tag bài chính ↔ bài biến thể.

Hiện trạng: code chưa có variant ở phần bài viết; loader chỉ nhận id bệnh → 4 bài RICE_BLAST* trong Design làm app không khởi động; unique `(disease_code, locale)` chặn 2 bài cùng bệnh.

## Module knowledge
- [x] 1. [domain-model]   Article thêm `variantCode` (null = bài chính); `articleCodeOf()` = variantCode ?? diseaseCode
- [x] 2. [use-case]       SeedArticles nhận seed có variantCode (TArticleSeed); RevalidateArticles: tag `article-disease:<mã bài>`, bài biến thể đổi → thêm tag bài chính, bài chính đổi → thêm tag các bài biến thể
- [x] 3. [use-case]       GetArticle: `variant`, `parentArticle`, `variantArticles` (theo thứ tự variants KB), link `/diseases/<id biến thể>` → bài biến thể hoặc bài chính; ListArticles: `variant`; GetDiseaseDetail: `article` = bài chính, `variants[].article`
- [x] 4. [persistence]    cột `articles.variant_code`, unique `(disease_code, coalesce(variant_code, ''), locale)`; repo tìm theo mã bệnh + mã biến thể; migration `knowledge-article-variants`
- [x] 5. [persistence]    FileArticleSource: `code` = id bệnh hoặc id biến thể của crop; bài biến thể cần bài chính của bệnh; link nhận id biến thể; `disease-card` chỉ id bệnh; test pack có 1 bài biến thể
- [x] 6. [http]           response class action 41, 42, 35 thêm trường; e2e
- [x] 7. [api-docs]       action 35, 41, 42; openapi:export
- [x] 8. [boundary-review]
- [x] 9. [sync]           copy 5 bài + ảnh từ Design (RICE_BLAST, RICE_BLAST__V1..V3, DURIAN_PHYTOPHTHORA_CANKER) vào crop pack, khởi động app kiểm seed
