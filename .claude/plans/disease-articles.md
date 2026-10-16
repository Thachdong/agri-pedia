# Feature: disease articles (spec: specs/disease-articles-plan.md)

Flow: app start → SeedKnowledgeBase → SeedArticles (upload ảnh public → upsert/xoá `articles`) → queue thay đổi → HTTP listen (`HttpAdapterHost.listen$`) → RevalidateArticles → webhook Next.js. Read: action 40–43 public + action 35 thêm `article`.

- [x] 1. [config-group]     `knowledge`: articleRevalidateUrl, articleRevalidateSecret (≥32 khi có URL); `storage`: publicBaseUrl; `.env.example`
- [x] 2. [shared-wrapper]   storage: IFileStorage.uploadPublicFile + publicUrl (Firebase + InMemory)
- [ ] 3. [domain-model]     Crop.slug; entity Article, EArticleStatus, service ArticleMarkdownResolver; errors KnowledgeArticleNotFound, KnowledgeArticleInvalidCursor
- [ ] 4. [use-case]         SeedKnowledgeBase seed thêm crop.slug; SeedArticles, ports IArticleSource, IArticleRepository (+ fakes)
- [ ] 5. [use-case]         RevalidateArticles (tính tag + bài tham chiếu), port IArticleCacheInvalidator
- [ ] 6. [use-case]         ListArticleCrops, ListArticles, GetArticle, GetArticleSitemap; GetDiseaseDetail thêm `article`
- [ ] 7. [persistence]      PgArticleRepository, bảng `articles` + cột `crops.slug`, migration `knowledge-articles`
- [ ] 8. [persistence]      FileArticleSource (frontmatter yaml + zod, validate mục 4, sharp width/height) + fixtures; crop.json slug; nest-cli assets; thêm dependency `yaml`
- [ ] 9. [persistence]      NextArticleCacheInvalidator (fetch, retry 5/15/45s) + ArticleRevalidationQueue; KnowledgeSeeder gọi SeedArticles, flush sau listen$
- [ ] 10. [http]            GET /knowledge/articles/crops, /knowledge/articles, /knowledge/articles/sitemap, /knowledge/articles/:cropSlug/:slug (Cache-Control 60s); GET /knowledge/diseases/:code thêm `article`
- [ ] 11. [api-docs]        4 endpoint mới + action 35
- [ ] 12. [boundary-review]
