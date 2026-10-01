# Feature: Public product detail + review summary + product reviews

Source: specs/api.md action 22 (get product detail). Login không cần cho cả 3 endpoint.

Flow A: `GET /products/:productId` (public, uuid param) (product module)
  → product.GetProductDetail({ productId })
    - products.findById (null / đã xoá → 404 PRODUCT_NOT_FOUND); trả mọi status (ACTIVE / INACTIVE / OUT_OF_STOCK)
    - media `IMediaQueryPort.listByOwner('PRODUCT', productId)` → mọi media (IMAGE/VIDEO/FILE) theo sortOrder, signed URL
  → 200 { id, name, description, price, quantity, unit, categoryId, status, distributorId, media: [{ id, type, url }] }

Flow B: `GET /reviews/summary?targetType=PRODUCT|USER&targetId=` (public) (review module)
  → review.GetReviewSummary({ targetType, targetId }) → reviews.summarizeByTarget (star counts)
  → 200 { avgRating, reviewCount, oneStarCount, twoStarCount, threeStarCount, fourStarCount, fiveStarCount }
    (avgRating 1 decimal, 0 khi chưa có review — giống summary của GET /reviews; target không tồn tại → toàn 0)

Flow C: `GET /reviews/products/:productId?star=&cursor=&limit=` (public) (review module)
  → review.ListProductReviews({ productId, star?, cursor?, limit })
    - product `IProductQueryPort.findOwnerById` (null / đã xoá → 404 REVIEW_TARGET_NOT_FOUND, đã có)
    - reviews.findByTargets({ userId: owner, productIds: [productId] }, { targetType: PRODUCT, star, after, limit }) — method đã có
    - reviewer: user `listProfilesByIds` (username) + media `findThumbnails('USER_AVATAR')` (avatar)
  → 200 { reviews: [{ id, star, content, createdAt, user: { id, username, avatar } }], nextCursor }
    Không kèm summary (đã có Flow B). Error thêm: REVIEW_INVALID_CURSOR.

Rating tách endpoint riêng: review đã phụ thuộc product (IProductQueryPort) → product không gọi ngược review được (circular).
Thứ tự lệch fixed order: query port media làm trước use case product vì use case cần nó.
No event, no migration, no new module.

- [x] 1. [persistence]  media: IMediaRepository.findAllByOwner(ownerType, ownerId) theo sortOrder (+ fake) — method đã có, chỉ thêm order
- [x] 2. [query-port]   media: IMediaQueryPort.listByOwner('PRODUCT', ownerId) → [{ mediaId, type, url }]
- [x] 3. [use-case]     product: GetProductDetail (+ distributorId; IProductRepository.findById, PRODUCT_NOT_FOUND đã có)
- [x] 4. [http]         GET /products/:productId (public): response + e2e
- [x] 5. [api-docs]     GET /products/:productId (gộp vào bước 4: defineApiDocs bắt buộc entry cho mỗi handler, build fail nếu thiếu)
- [x] 6. [use-case]     review: GetReviewSummary; port IReviewRepository.summarizeByTarget (+ fake)
- [x] 7. [persistence]  review: PgReviewRepository.summarizeByTarget (no migration)
- [x] 8. [http]         GET /reviews/summary (public): query DTO, response + e2e
- [x] 9. [api-docs]     GET /reviews/summary (gộp vào bước 8, cùng lý do bước 5)
- [ ] 10. [use-case]    review: ListProductReviews (IProductQueryPort, IUserQueryPort, IMediaQueryPort, findByTargets — đều đã có)
- [ ] 11. [http]        GET /reviews/products/:productId (public): query DTO, response + e2e
- [ ] 12. [api-docs]    GET /reviews/products/:productId
- [ ] 13. [boundary-review]
