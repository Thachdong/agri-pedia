# Feature: product-suggestion

Distributor chụp 1 ảnh (focus tên sản phẩm) → server (không lưu ảnh) → AI rẻ (Gemini, không tools) đọc tên thương phẩm → fuzzy query catalog KB (pg_trgm, top 1 ≥ ngưỡng) → trả kết quả cho client fill form (chỉ `name` + `description`). User review/sửa rồi submit `POST /products` như cũ (ảnh product vẫn qua media).

Kết quả: `UNREADABLE` | `NOT_FOUND { detectedName }` | `FOUND { suggestion: { name, description } }`, luôn kèm `remaining`.

Quota (lifetime, không reset, admin chỉnh):
- L1 `invalidImageLimit` (user thấy): trừ bởi UNREADABLE + FOUND.
- L2 `notFoundLimit` (bonus ẩn): trừ bởi NOT_FOUND; hết L2 → NOT_FOUND trừ L1.
- Check trước khi gọi AI: L1 còn lượt. Reserve atomic 1 lượt L1; provider lỗi → hoàn; NOT_FOUND + L2 còn → chuyển sang L2.
- `remaining` = L1 − đã trừ L1 (min 0).

Mọi NOT_FOUND ghi log miss; admin xem gộp theo tên chuẩn hóa. Admin CRUD catalog (name, description). Tất cả trong module `product`. Bỏ hẳn làm giàu KB từ user.

- [x] 1. [config-group]   `productSuggestion`: provider, apiKey, model, timeoutMs, matchThreshold
- [x] 2. [domain-model]   product: CatalogItem (name, normalizedName, description); normalizeProductName (lowercase, bỏ dấu, gộp space); ProductSuggestionSettings (invalidImageLimit, notFoundLimit); ProductSuggestionUsage (used, bonusUsed; reserve/refund/settleNotFound); ProductSuggestionMiss; EProductSuggestionStatus; errors CatalogItemNotFound, CatalogItemNameTaken, InvalidCatalogItem, SuggestionQuotaExceeded, InvalidSuggestionSettings, SuggestionImageInvalid
- [x] 3. [use-case]       SuggestProduct (distributor); ports IProductNameReader, ICatalogRepository (findBestMatch), IProductSuggestionUsageRepository (reserve/refund/moveToBonus atomic), IProductSuggestionSettingsRepository, IProductSuggestionMissRepository
- [x] 4. [use-case]       admin catalog: ListCatalogItems (search + page/limit), CreateCatalogItem, UpdateCatalogItem, DeleteCatalogItem
- [x] 5. [use-case]       admin: GetProductSuggestionSettings, UpdateProductSuggestionSettings, ListProductSuggestionMisses (gộp normalizedName: count, số shop, lần cuối; sort count desc)
- [ ] 6. [persistence]    tables `product_catalog_items` (unique + trigram index normalized_name; migration bật `pg_trgm`), `product_suggestion_settings` (1 row; chưa có = defaults), `product_suggestion_usages`, `product_suggestion_misses`; Pg repos
- [ ] 7. [adapter]        AiProductNameReader (infrastructure/vision, `shared/ai`, sharp resize trong memory; prompt: tên thương phẩm nổi bật nhất, rỗng nếu không đọc được)
- [ ] 8. [http]           POST /products/suggestions (multipart `image`, distributor)
- [ ] 9. [api-docs]       POST /products/suggestions
- [ ] 10. [http]          /admin/product-catalog (GET, POST, PATCH /:id, DELETE /:id); GET/PUT /admin/product-suggestion/settings; GET /admin/product-suggestion/misses
- [ ] 11. [api-docs]      admin endpoints
- [ ] 12. [boundary-review]

Decisions:
- Defaults: invalidImageLimit = 50, notFoundLimit = 50.
- Không có endpoint quota riêng; `remaining` chỉ trả trong response suggest.
- API key riêng `PRODUCT_SUGGESTION_API_KEY` (tạm thời set cùng giá trị key diagnosis trong .env).
- matchThreshold default 0.4 (pg_trgm similarity), env chỉnh được.
- Ảnh: 1 file, jpeg/png/webp, ≤ 5MB (hằng số); resize long side ≤ 1024 trước khi gửi AI; không lưu.
- Không tìm thấy trong KB → không cho AI sinh description.
- Lỗi validate ảnh / provider lỗi → không trừ lượt.
- Hạ limit dưới số đã dùng → remaining = 0.
- Xóa catalog item: hard delete (product không tham chiếu catalog).
