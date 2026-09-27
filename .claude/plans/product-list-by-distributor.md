# Feature: List products of a distributor (public)

Source: specs/api.md §21 get products.

Flow: `GET /products?distributorId=<uuid>&cursor=<opaque>&limit=<1..50, default 20>` (public, no guard) (product module)
  → product.ListDistributorProducts({ distributorId, cursor?, limit })
  (user query port findProfileById: null or role ≠ DISTRIBUTOR → 404 PRODUCT_DISTRIBUTOR_NOT_FOUND;
   bad cursor → 400 PRODUCT_INVALID_CURSOR;
   products where user_id = distributorId, status = ACTIVE, deleted_at IS NULL, order by created_at desc, id desc, keyset page of limit + 1;
   media query port findThumbnails(PRODUCT, productIds) → signed read URL of first IMAGE by sortOrder (null last, then id), or null)
  → 200 { products: [{ id, name, price, quantity, unit, thumbnail, distributorId, distributorName }], nextCursor: string | null }

- [x] 1. [config-group]       storage: STORAGE_DOWNLOAD_URL_TTL_SECONDS (default 3600)
- [x] 2. [shared-wrapper]     storage: IFileStorage.createDownloadUrl(key) (V4 signed GET); firebase adapter + in-memory fake
- [x] 3. [domain-model]       product: Product.createdAt (set on create); error PRODUCT_DISTRIBUTOR_NOT_FOUND (NOT_FOUND), PRODUCT_INVALID_CURSOR (VALIDATION)
      + column `products.created_at` (existing rows = now()) + index (user_id, created_at, id) + ProductMapper + migration (same reason as delete step 1: restore needs it)
- [x] 4. [query-port]         user: IUserQueryPort.findProfileById(userId) → { userId, username, role } | null; consumed by product
- [x] 5. [query-port]         media: IMediaQueryPort.findThumbnails(ownerType 'PRODUCT', ownerIds) → [{ ownerId, url }]; port IMediaRepository.findFirstImagesByOwners; uses IFileStorage.createDownloadUrl; consumed by product
- [x] 6. [use-case]           product: ListDistributorProducts, port IProductRepository.findActiveByUser(userId, { after?, limit }); cursor encode/decode
- [x] 7. [persistence]        product: PgProductRepository.findActiveByUser (keyset); media: PgMediaRepository.findFirstImagesByOwners
      + data migration `product-truncate-products-created-at` (backfilled µs → ms, else cursor skips rows)
- [x] 8. [http]               GET /products?distributorId&cursor&limit (public)
- [x] 9. [api-docs]           GET /products
- [x] 10. [boundary-review]

Order note: query ports (4, 5) before the use case (6) because it depends on them.

## Decisions (defaults — change if wrong)
- thumbnail = signed read URL (approved); bucket stays private. TTL default 1h.
- Unknown id or not a DISTRIBUTOR → 404 PRODUCT_DISTRIBUTOR_NOT_FOUND (approved). A PENDING distributor → 200 with empty list (has no products anyway).
- Route `GET /products?distributorId=...` (spec input name kept); distributorId required.
- limit: integer 1..50, default 20. Cursor: opaque base64url of `{ createdAt, id }` of the last item; malformed → 400.
- Only ACTIVE, not deleted products (spec); INACTIVE / OUT_OF_STOCK hidden.
- thumbnail = first IMAGE media (sortOrder asc, null last, then id); none → null. VIDEO/FILE never used as thumbnail.
- price returned as number (same as create input).
- distributorName = user.username.

## Open questions
- none (answered: signed read URL, 404 for unknown distributor)
