# Feature: List reviews of a distributor's shop (public)

Source: specs/api.md §25 get reviews (shop); entities §10 Review.

Flow: `GET /reviews?distributorId=<uuid>&targetType=<USER|PRODUCT>?&star=<1..5>?&cursor=<opaque>?&limit=<1..50, default 20>` (public, no guard) (review module)
  → review.ListDistributorReviews({ distributorId, targetType?, star?, cursor?, limit })
  (bad cursor → 400 REVIEW_INVALID_CURSOR;
   user query port findProfileById(distributorId): null or role ≠ DISTRIBUTOR → 404 REVIEW_DISTRIBUTOR_NOT_FOUND;
   product query port listBySeller(distributorId) → [{ productId, name }] (every status, deleted included);
   shop targets = (USER, distributorId) + (PRODUCT, productIds);
   summary over all shop targets (no filter, no cursor): avgRating, reviewCount, starCounts 1..5;
   page: shop targets ∩ filter targetType/star, order created_at desc, id desc, keyset limit + 1;
   user query port listProfilesByIds(reviewerIds) → username;
   media query port findThumbnails('USER_AVATAR', reviewerIds) → avatar signed URL)
  → 200 { summary: { avgRating, reviewCount, starCounts: { 1..5 } },
          reviews: [{ id, targetType, targetId, productName, star, content, createdAt, user: { id, username, avatar } }],
          nextCursor }

- [x] 1. [domain-model]       review: errors REVIEW_DISTRIBUTOR_NOT_FOUND (NOT_FOUND), REVIEW_INVALID_CURSOR (VALIDATION)
- [x] 2. [query-port]         product: IProductQueryPort.listBySeller(sellerId) → [{ productId, name }] (all statuses, deleted included); consumed by review
- [x] 3. [query-port]         user: IUserQueryPort.listProfilesByIds(userIds) → [{ userId, username, role }]; consumed by review (findProfileById reused for the distributor check)
- [x] 4. [query-port]         media: IMediaQueryPort.findThumbnails ownerType widened to 'PRODUCT' | 'USER_AVATAR'; consumed by review
- [x] 5. [use-case]           review: ListDistributorReviews, ports IReviewRepository.findByTargets(targets, { targetType?, star?, after?, limit }) + summarizeByTargets(targets); cursor encode/decode
- [x] 6. [persistence]        review: PgReviewRepository.findByTargets (keyset), summarizeByTargets (one aggregate query) + index (target_id, created_at, id) + migration
- [ ] 7. [http]               GET /reviews?distributorId&targetType&star&cursor&limit (public)
- [ ] 8. [api-docs]           GET /reviews
- [ ] 9. [boundary-review]

Order note: query ports (2–4) before the use case (5) because it depends on them.

## Decisions (defaults — change if wrong)
- Route `GET /reviews?distributorId=...` (same style as `GET /products?distributorId=...`); distributorId required.
- Unknown id or not a DISTRIBUTOR → 404 REVIEW_DISTRIBUTOR_NOT_FOUND. PENDING distributor → 200 (spec checks role only; it has no reviews anyway).
- Products of every status, soft-deleted included (spec "mọi status"): old product reviews stay in the shop history, with productName.
- Shop membership by product-id list from the product module (IN list), not a copied owner column: no schema change on `reviews`, no cross-module backfill. Fine for hundreds–low thousands of products per shop; revisit (store `target_owner_id`) if shops get much bigger.
- productName: set for PRODUCT reviews, null for USER reviews.
- avatar: signed read URL of the reviewer's avatar image (same as product thumbnail, expires after the configured TTL), null when none.
- avgRating: rounded to 1 decimal; 0 when reviewCount = 0. starCounts always has keys 1..5 (0 when none).
- limit 1..50, default 20. Cursor: opaque base64url `{ createdAt, id }` (same as other lists); a cursor is only valid with the same filters.
- star filter: integer 1..5, else 400 (DTO validation).

## Open questions
- none
