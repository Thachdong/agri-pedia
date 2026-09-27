# Feature: Create product (DISTRIBUTOR, ACTIVE)

Source: specs/api.md §13 create product; entities §7 Media, §8 Product, §9 Category.

Flow: `POST /products { name, description, price, categoryId, quantity, unit, media: [{ key, type, extension, filename, sortOrder? }] }` + `Authorization: Bearer <accessToken>` (product module)
  → AccessTokenGuard (401) → product.CreateProduct({ userId, ... })
  (user query port findRoleById: userId → role + active; not DISTRIBUTOR or not ACTIVE → 403; category must exist → 404;
   save Product { ..., userId, status: ACTIVE } in transaction)
  → emits `product.product.created` { productId, userId, media[] } after commit
  → media module handles → media.ConfirmMedia(ownerType PRODUCT, ownerId productId)
    (per file: key must be `tmp/{userId}/...`, extension valid for type, move tmp → `products/{productId}/{uuid}.{ext}`, save Media row)
  → 201 { productId }

Category: seeded by migration (3 rows mapped from business types); `GET /categories` → 200 { items: [{ id, name }] } (public) so client can pick categoryId.

- [x] 1. [shared-wrapper]     storage: IFileStorage.moveFile(fromKey, toKey) (source missing → error); firebase adapter + in-memory fake
- [x] 2. [module-scaffold]    module `product`
- [x] 3. [domain-model]       product: Product (price ≥ 0, quantity integer ≥ 0), EProductUnit, EProductStatus; errors PRODUCT_INVALID_PRICE, PRODUCT_INVALID_QUANTITY, PRODUCT_CATEGORY_NOT_FOUND, PRODUCT_SELLER_NOT_ALLOWED (FORBIDDEN)
- [x] 4. [domain-model]       media: Media entity (source key derived), EMediaOwnerType (PRODUCT only for now), VO TmpMediaKey (tmp-key ownership rule); error MEDIA_INVALID_TMP_KEY
- [x] 5. [query-port]         user: IUserQueryPort.findRoleById(userId) → { userId, role, isActive }; consumed by product
- [ ] 6. [use-case]           product: CreateProduct, ports IProductRepository, ICategoryRepository (exists)
- [ ] 6b. [use-case]          product: ListCategories (ICategoryRepository.findAll)
- [ ] 7. [use-case]           media: ConfirmMedia, port IMediaRepository (uses IFileStorage.moveFile)
- [ ] 8. [persistence]        product: PgProductRepository, PgCategoryRepository; tables `products`, `categories` + seed migration (3 categories)
- [ ] 9. [persistence]        media: PgMediaRepository; table `media`
- [ ] 10. [integration-event] CreateProduct emits `product.product.created`
- [ ] 11. [event-handler]     media: `product.product.created` → ConfirmMedia (ownerType PRODUCT)
- [ ] 12. [http]              POST /products (guarded), GET /categories (public)
- [ ] 13. [api-docs]          POST /products (auth: true), GET /categories
- [ ] 14. [boundary-review]

Order note: query-port (5) before CreateProduct (6) because the use case depends on it.

## Decisions (defaults — change if wrong)
- Role/status checked via user query port, not token: access token payload only has `userId`.
- Media confirm is async via event: CreateProduct lives in product, Media rows + storage belong to media; sync cross-module calls are read-only (hard rule). Consequence: response returns before files move; a bad media item (wrong owner prefix, missing file, bad extension) is skipped + logged, product still created.
- `Media.source` = final storage key (`products/{productId}/{uuid}.{ext}`), not a URL.
- `unit` values: kg | 10kg | 50kg | 100kg | bag | piece | ton (api.md; entities.md `100k` treated as typo).
- media array: 1..10 items (approved: at least 1; max same as presign batch).
- Category owned by product module (table `categories`). Basic support: seed migration + GET /categories. No create/update/delete API (no admin role yet).
- Seed names: `Thuốc & vật tư nông nghiệp`, `Giống cây trồng`, `Giống thủy sản`.
- Media confirm via event (approved).

## Open questions
- none (answered: category basic support, event OK, ≥1 media)
