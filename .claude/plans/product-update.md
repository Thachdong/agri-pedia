# Feature: Update product (DISTRIBUTOR, owner)

Source: specs/api.md §14 update product; entities §7 Media, §8 Product.

Flow: `PATCH /products/:productId { name?, description?, price?, quantity?, unit?, categoryId?, status?, addMedia?: [{ key, type, extension, filename, sortOrder? }], removeMediaIds?: string[] }` + `Authorization: Bearer <accessToken>` (product module)
  → AccessTokenGuard (401) → product.UpdateProduct({ userId, productId, ... })
  (user query port findRoleById: not DISTRIBUTOR or not ACTIVE → 403 PRODUCT_SELLER_NOT_ALLOWED;
   product must exist → 404 PRODUCT_NOT_FOUND; product.userId ≠ userId → 403 PRODUCT_NOT_OWNER;
   categoryId given → must exist → 404 PRODUCT_CATEGORY_NOT_FOUND; apply fields via Product.update (price/quantity invariants); save in transaction)
  → emits `product.product.updated` { productId, userId, addMedia[], removeMediaIds[] } after commit
  → media module handles →
      media.RemoveMedia(ownerType PRODUCT, ownerId productId, mediaIds) (delete rows where id ∈ ids AND owner matches, others ignored; after commit delete storage objects `media.source`)
      media.ConfirmMedia(ownerType PRODUCT, ownerId productId, files addMedia) (existing use case)
  → 204 No Content

- [x] 0. [shared-wrapper]     storage: IFileStorage.deleteFile(key) (missing object → no-op); firebase adapter + in-memory fake
- [x] 1. [domain-model]       product: Product.update(partial fields) reusing price/quantity invariants; errors PRODUCT_NOT_FOUND (NOT_FOUND), PRODUCT_NOT_OWNER (FORBIDDEN)
- [x] 2. [use-case]           product: UpdateProduct, port IProductRepository.findById (+ existing save, ICategoryRepository.existsById, IUserQueryPort.findRoleById)
- [x] 3. [use-case]           media: RemoveMedia, port IMediaRepository.findByOwner(ownerType, ownerId, ids) + delete(ids); uses IFileStorage.deleteFile
- [x] 4. [persistence]        product: PgProductRepository.findById; media: PgMediaRepository.findByOwner + delete (no migration)
- [x] 5. [integration-event]  UpdateProduct emits `product.product.updated`
- [ ] 6. [event-handler]      media: `product.product.updated` → RemoveMedia + ConfirmMedia (ownerType PRODUCT)
- [ ] 7. [http]               PATCH /products/:productId (guarded)
- [ ] 8. [api-docs]           PATCH /products/:productId (auth: true)
- [ ] 9. [boundary-review]

## Decisions (defaults — change if wrong)
- Role + ACTIVE check same as create (spec WHO: DISTRIBUTOR); locked distributor cannot edit.
- Not owner → 403 PRODUCT_NOT_OWNER (not 404 masking).
- Media changes async via event (same reason as create: media rows + storage owned by media module, sync cross-module = read-only). Response returns before files move/rows delete.
- removeMediaIds of other owner / unknown → silently ignored (async, cannot fail the request).
- RemoveMedia deletes DB rows in transaction, then storage objects after commit (approved). Storage delete failure → logged, not retried (orphan file, row already gone).
- addMedia: 0..10 items per request (same max as create); total count per product not enforced.
- No fields at all → still 204 (no-op save, event with empty lists).
- Event always published after commit; handler skips empty lists.

## Open questions
- none (answered: delete storage objects too)
