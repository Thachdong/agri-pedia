# Feature: disease articles (spec: specs/disease-articles-plan.md)

Flow: app start → SeedKnowledgeBase → SeedArticles (upload ảnh public → upsert/xoá `articles`) → queue thay đổi → HTTP listen (`HttpAdapterHost.listen$`) → RevalidateArticles → webhook Next.js. Read: action 40–43 public + action 35 thêm `article`.

- [x] 1. [config-group]     `knowledge`: articleRevalidateUrl, articleRevalidateSecret (≥32 khi có URL); `storage`: publicBaseUrl; `.env.example`
- [x] 2. [shared-wrapper]   storage: IFileStorage.uploadPublicFile + publicUrl (Firebase + InMemory)
- [x] 3. [domain-model]     Crop.slug (kèm crop.json slug + validate unique, ORM column, mapper, fakes để build xanh; migration ở bước 7); entity Article, EArticleStatus, service ArticleMarkdownResolver; errors KnowledgeArticleNotFound, KnowledgeArticleInvalidCursor
- [x] 4. [use-case]         SeedArticles, ports IArticleSource, IArticleRepository (+ fakes); IKnowledgeRepository.listCrops
- [x] 5. [use-case]         RevalidateArticles (tính tag + bài tham chiếu), port IArticleCacheInvalidator
- [x] 6. [use-case]         ListArticleCrops, ListArticles, GetArticle, GetArticleSitemap; GetDiseaseDetail thêm `article`
- [x] 7. [persistence]      PgArticleRepository, bảng `articles` + cột `crops.slug`, migration `knowledge-articles`
- [x] 8. [persistence]      FileArticleSource (frontmatter yaml + zod, validate mục 4, sharp width/height) + test pack tạm; 2 bài mẫu từ Design; nest-cli assets; thêm dependency `yaml`
- [x] 9. [persistence]      NextArticleCacheInvalidator (fetch, retry 5/15/45s); KnowledgeSeeder gọi SeedArticles, RevalidateArticles sau listen$ (bỏ ArticleRevalidationQueue: seeder tự giữ kết quả)
- [x] 10. [http]            GET /knowledge/articles/crops, /knowledge/articles, /knowledge/articles/sitemap, /knowledge/articles/:cropSlug/:slug (Cache-Control 60s); GET /knowledge/diseases/:code thêm `article`
- [x] 11. [api-docs]        4 endpoint mới + action 35
- [x] 12. [boundary-review]
