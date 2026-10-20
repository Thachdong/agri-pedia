# Feature: Admin quản lý bài viết bệnh (role ADMIN mới)

Admin xem danh sách bệnh (+ biến thể) của 1 cây kèm bài (chưa có / có: nguồn gốc, published), xem bài (nội dung gốc), tạo bài khi chưa có, sửa nội dung, unpublish / publish lại.

Flow:
- `npm run create-admin -- <email> <password>` → user.CreateAdmin → user ADMIN ACTIVE → login bằng API có sẵn.
- Admin request (AccessTokenGuard) → knowledge use case → `IUserQueryPort.findRoleById` (role ADMIN + ACTIVE, else 403) → đọc/ghi `articles` → sau commit RevalidateArticles (webhook Next.js).
- Ảnh: client presign (media, `tmp/<adminId>/...`) → PUT → gửi tmp key + alt/caption/credit trong body → knowledge `IArticleImagePublisher`: tải tmp → webp (sharp) → sha256/width/height → upload public `articles/<CROP>/<CODE>/<name>.<sha8>.webp` → xoá tmp.
- Nguồn gốc bài (`origin`): seed = `AI`; admin tạo = `ADMIN`; admin sửa bài `AI` = `AI_REVIEWED` (sửa bài `ADMIN` / `AI_REVIEWED` giữ nguyên). `editedBy` = userId admin sửa/tạo gần nhất.
- Seed: chỉ quản lý bài `origin = AI` (revise / xoá); bài `ADMIN` / `AI_REVIEWED` seed bỏ qua. Seed revise giữ nguyên `published`.
- Publish: bài tạo ra luôn published; admin unpublish = ẩn khỏi mọi API public (list, detail 404, sitemap, số bài theo cây, `article` ở action 35, link `/diseases/<CODE>` coi như chưa có bài); publish lại được.

## Decisions (approved)
1. Seed vs admin: DB thắng sau khi admin tạo/sửa (origin ≠ AI).
2. Tạo admin: CLI script; đăng ký public không được chọn ADMIN.
3. Đánh dấu nguồn gốc AI / ADMIN / AI_REVIEWED thay cho "duyệt".
4. Slug cố định; sửa chỉ đổi nội dung (title, summary, markdown, cover, images, sources).
5. Ảnh mới qua presign có sẵn; cover bắt buộc như seed.
6. Không xoá bài qua admin; ẩn bằng unpublish.

## Shared
- [x] 1. [shared-wrapper]   storage: IFileStorage.downloadFile(key) → Buffer (Firebase + InMemory; StorageFileNotFoundError)

## Module user
- [x] 2. [domain-model]     EUserRole.ADMIN; User.createAdmin (ACTIVE); đăng ký public chỉ nhận FARMER | DISTRIBUTOR (domain USER_ROLE_NOT_ALLOWED + DTO @IsIn); contracts role union thêm ADMIN (để build xanh)
- [x] 3. [use-case]         CreateAdmin (email + password; identifier đã dùng → lỗi có sẵn)
- [x] 4. [script]           `scripts/create-admin.ts` + `npm run create-admin -- <email|phone> [username]` (password hỏi trên terminal; module CLI tối giản → CreateAdmin)
- [x] 5. [query-port]       knowledge inject USER_QUERY_PORT (role union đã thêm ADMIN ở bước 2)

## Module knowledge
- [x] 6. [domain-model]     Article: EArticleOrigin (AI | ADMIN | AI_REVIEWED), `editedBy`, `published`; createByAdmin / editContent (slug cố định, chuyển origin) / unpublish / publish; isIndexable cần published; tách kiểm nội dung (link `/diseases/<CODE>`, `disease-card`, ảnh trong markdown, cover ∈ images) từ FileArticleSource sang domain service; errors KNOWLEDGE_ADMIN_REQUIRED (FORBIDDEN), KNOWLEDGE_ARTICLE_ALREADY_EXISTS, KNOWLEDGE_ARTICLE_SLUG_TAKEN (CONFLICT), KNOWLEDGE_ARTICLE_INVALID_CONTENT (VALIDATION, details.issues); kéo sớm từ bước 14 để build/e2e xanh: cột ORM `origin`, `edited_by`, `is_published` + mapper + migration `knowledge-article-admin`
- [x] 7. [use-case]         SeedArticles: chỉ revise / xoá bài origin AI, giữ `published`; bỏ qua + log warn khi pack trùng mã hoặc slug bài admin
- [x] 8. [use-case]         Public read (ListArticleCrops, ListArticles, GetArticle, GetArticleSitemap, GetDiseaseDetail): chỉ bài published — port đổi tên countPublishedByCrop / listPublishedPage / findPublishedBySlug / findPublishedByDiseaseCodes, lọc ở fake + Pg (kéo sớm từ bước 14)
- [x] 9. [use-case]         ListAdminArticleTargets(crop): bệnh + biến thể theo thứ tự KB, mỗi mục kèm bài (slug, title, origin, published, editedBy, updatedAt) hoặc null
- [x] 10. [use-case]        GetAdminArticle(code): nội dung gốc (markdown chưa resolve, images + publicUrl, sources, origin, published, editedBy), cả bài unpublished; port findByKbCode (fake + Pg); không có bài → KNOWLEDGE_ARTICLE_NOT_FOUND (KnowledgeArticleCodeNotFoundException)
- [x] 11. [use-case]        CreateArticle(code, slug, content, ảnh tmp): mã KB tồn tại, chưa có bài, slug chưa dùng trong cây, bài biến thể cần bài chính; origin ADMIN, published; port IArticleImagePublisher (+ fake), IArticleRepository.existsBySlug; kiểm nội dung trước khi publish ảnh; xoá tmp + revalidate (nền) sau commit; error mới KNOWLEDGE_ARTICLE_IMAGE_INVALID; helper chung `application/admin-article-support.ts`
- [x] 12. [use-case]        UpdateArticle(code, content): giữ ảnh cũ theo `file` + ảnh tmp mới, ảnh không gửi lên bị bỏ; origin AI → AI_REVIEWED; giữ trạng thái published; revalidate sau commit
- [x] 13. [use-case]        UnpublishArticle / PublishArticle; revalidate sau commit
- [x] 14. [persistence]     Pg: findByKbCode, existsBySlug, listByCrop (thêm cùng các bước use case để build xanh), cột + migration ở bước 6, lọc published ở bước 8; mapper spec round-trip origin/editedBy/isPublished; migration revert+run OK
- [x] 15. [persistence]     SharpArticleImagePublisher (`infrastructure/images/`; IFileStorage.downloadFile + sharp → webp ≤1600px → uploadPublicFile; xoá tmp do use case sau commit) — làm ngay sau bước 11 để app boot
- [x] 16. [http]            `admin/knowledge`: GET crops/:cropSlug/articles, GET articles/:code, POST articles, PUT articles/:code (thay toàn bộ nội dung nên PUT thay PATCH), POST articles/:code/unpublish, POST articles/:code/publish; e2e `test/knowledge/admin-articles.e2e-spec.ts`
- [x] 17. [api-docs]        6 endpoint trên (auth: true, 403 KNOWLEDGE_ADMIN_REQUIRED); openapi:export
- [x] 18. [boundary-review] — 0 HIGH, 0 MED, 2 LOW (xem báo cáo)

7. `status` + `reviewedBy`/`reviewedAt` giữ cho bài AI (từ frontmatter); bài admin tạo/sửa → REVIEWED, reviewedBy = userId admin, reviewedAt = now. Sitemap = REVIEWED + published.

## Change: admin crop list
Flow: `GET /admin/knowledge/crops` → ListAdminArticleCrops (admin check) → mọi crop + targetCount / articleCount / publishedCount → admin chọn `cropSlug` cho action 44. Lý do: action 33 chỉ trả crop đang bật, action 40 chỉ crop có bài publish.
- [x] 19. [use-case]        ListAdminArticleCrops
- [x] 20. [http]            GET /admin/knowledge/crops; e2e
- [x] 21. [api-docs]        GET /admin/knowledge/crops; openapi:export; specs/api.md action 50

