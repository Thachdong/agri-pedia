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
- [ ] 5. [query-port]       knowledge inject USER_QUERY_PORT (role union đã thêm ADMIN ở bước 2)

## Module knowledge
- [ ] 6. [domain-model]     Article: EArticleOrigin (AI | ADMIN | AI_REVIEWED), `editedBy`, `published`; createByAdmin / editContent (slug cố định, chuyển origin) / unpublish / publish; isIndexable cần published; tách kiểm nội dung (link `/diseases/<CODE>`, `disease-card`, ảnh trong markdown, cover ∈ images) từ FileArticleSource sang domain service; errors KNOWLEDGE_ADMIN_REQUIRED (FORBIDDEN), KNOWLEDGE_ARTICLE_ALREADY_EXISTS, KNOWLEDGE_ARTICLE_SLUG_TAKEN (CONFLICT), KNOWLEDGE_ARTICLE_INVALID_CONTENT (VALIDATION)
- [ ] 7. [use-case]         SeedArticles: chỉ revise / xoá bài origin AI, giữ `published`; log khi pack có bài trùng mã bài admin
- [ ] 8. [use-case]         Public read (ListArticleCrops, ListArticles, GetArticle, GetArticleSitemap, GetDiseaseDetail): chỉ bài published
- [ ] 9. [use-case]         ListAdminArticleTargets(crop): bệnh + biến thể theo thứ tự KB, mỗi mục kèm bài (slug, title, origin, published, editedBy, updatedAt) hoặc null
- [ ] 10. [use-case]        GetAdminArticle(code): nội dung gốc (markdown chưa resolve, images + publicUrl, sources, origin, published, editedBy), cả bài unpublished
- [ ] 11. [use-case]        CreateArticle(code, slug, content, ảnh tmp): mã KB tồn tại, chưa có bài, slug chưa dùng trong cây, bài biến thể cần bài chính; origin ADMIN, published; port IArticleImagePublisher (+ fake); revalidate sau commit
- [ ] 12. [use-case]        UpdateArticle(code, content): giữ ảnh cũ theo `file` + ảnh tmp mới; origin AI → AI_REVIEWED; revalidate sau commit
- [ ] 13. [use-case]        UnpublishArticle / PublishArticle; revalidate sau commit
- [ ] 14. [persistence]     cột `articles.origin`, `edited_by`, `published`; repo lọc published cho public, findByKbCode, slugTaken; migration `knowledge-article-admin`
- [ ] 15. [persistence]     SharpArticleImagePublisher (IFileStorage.downloadFile + sharp → webp → uploadPublicFile → deleteFile tmp)
- [ ] 16. [http]            `admin/knowledge`: GET crops/:cropSlug/articles, GET articles/:code, POST articles, PATCH articles/:code, POST articles/:code/unpublish, POST articles/:code/publish; e2e
- [ ] 17. [api-docs]        6 endpoint trên (auth: true, 403 KNOWLEDGE_ADMIN_REQUIRED); openapi:export
- [ ] 18. [boundary-review]

7. `status` + `reviewedBy`/`reviewedAt` giữ cho bài AI (từ frontmatter); bài admin tạo/sửa → REVIEWED, reviewedBy = userId admin, reviewedAt = now. Sitemap = REVIEWED + published.
