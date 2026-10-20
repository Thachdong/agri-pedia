Feature: Ảnh bìa bài viết bắt buộc + ảnh bìa cho "Các dạng bệnh" (spec: specs/disease-articles-plan.md mục 4; api.md action 42; Design article-plan.md mục 5.4)

Flow: crop pack `articles/<CODE>.md` phải có `cover` (thuộc `images`) → FileArticleSource từ chối bài thiếu cover → GetArticle trả `variantArticles[].coverUrl` (public URL ảnh bìa bài biến thể) → client hiện ảnh trên thẻ "Các dạng bệnh".

Giữ nguyên: cột `articles.cover` và `Article.cover` vẫn nullable (bài không gắn bệnh / bài nháp CMS sau này) — chỉ bắt buộc ở bước seed. Không migration.

## Module knowledge
- [x] 1. [use-case]        GetArticle: `variantArticles[]` thêm `coverUrl` (public URL ảnh bìa bài biến thể, null nếu không có); unit test
- [x] 2. [persistence]     FileArticleSource: frontmatter `cover` bắt buộc (vẫn phải thuộc `images`); fixture + test (thiếu cover → lỗi seed)
- [x] 3. [http]            VariantArticleResponse thêm `coverUrl`; e2e action 42
- [x] 4. [api-docs]        action 42 (`variantArticles[].coverUrl`); cập nhật specs/api.md, openapi:export, copy api.md + openapi.json sang client/specs
- [x] 5. [boundary-review]
