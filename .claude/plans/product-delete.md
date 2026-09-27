# Feature: Delete product (DISTRIBUTOR, owner) — soft delete + remove media

Source: not in specs/api.md; requested directly. Soft delete keeps the product row so future reviews can still resolve `productId → name`.

Flow: `DELETE /products/:productId` + `Authorization: Bearer <accessToken>` (product module)
  → AccessTokenGuard (401) → product.DeleteProduct({ userId, productId })
  (user query port findRoleById: not DISTRIBUTOR or not ACTIVE → 403 PRODUCT_SELLER_NOT_ALLOWED;
   product must exist and not be deleted → 404 PRODUCT_NOT_FOUND; product.userId ≠ userId → 403 PRODUCT_NOT_OWNER;
   Product.delete() sets deletedAt; save in transaction)
  → emits `product.product.deleted` { productId } after commit
  → media module handles → media.RemoveAllMedia(ownerType PRODUCT, ownerId productId)
    (delete all Media rows of the owner in transaction, then their storage objects after commit)
  → 200 (null body)

- [x] 1. [domain-model]       product: Product.deletedAt + Product.delete() (sets deletedAt now)
      + (pulled from step 4, approved) column `products.deleted_at` + ProductMapper + migration `product-add-products-deleted-at`
- [ ] 2. [use-case]           product: DeleteProduct (existing ports: IProductRepository.findById/save, IUserQueryPort.findRoleById)
- [ ] 3. [use-case]           media: RemoveAllMedia, port IMediaRepository.findAllByOwner(ownerType, ownerId) (+ existing delete); uses IFileStorage.deleteFile
- [ ] 4. [persistence]        product: PgProductRepository.findById excludes deleted; media: PgMediaRepository.findAllByOwner
- [ ] 5. [integration-event]  DeleteProduct emits `product.product.deleted`
- [ ] 6. [event-handler]      media: `product.product.deleted` → RemoveAllMedia (ownerType PRODUCT)
- [ ] 7. [http]               DELETE /products/:productId (guarded) → 200 null body
- [ ] 8. [api-docs]           DELETE /products/:productId (auth: true)
- [ ] 9. [boundary-review]

## Decisions (defaults — change if wrong)
- Soft delete + remove media (approved).
- Role + ACTIVE check same as create/update; not owner → 403 PRODUCT_NOT_OWNER.
- Deleted product is invisible to `findById` → update/delete on it → 404 PRODUCT_NOT_FOUND (delete twice → 404, not idempotent 200).
- `status` is left unchanged; deletion is tracked only by `deleted_at`.
- Separate use case RemoveAllMedia (not `RemoveMedia` with optional ids) so a missing list can never mean "delete everything" by accident.
- Storage delete failure → logged, not retried (same as RemoveMedia).
- 200 + null body (project convention, same as PATCH).

## Open questions
- none (answered: soft delete + remove media)
