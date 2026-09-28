# Feature: Update review (FARMER edits own review of DISTRIBUTOR or product)

Source: specs/api.md §26 "delete review (shop and product)" — title says delete, body is an update (input content?/star?, implement "update"). Implemented as update. Entities §4 Notification, §10 Review.

Flow: `PATCH /reviews/:reviewId { content?, star?: 1..5 }` + `Authorization: Bearer <accessToken>` (review module)
  → AccessTokenGuard (401) → review.UpdateReview({ userId, reviewId, content?, star? })
  (user query port findRoleById(userId): not FARMER or not ACTIVE → 403 REVIEW_REVIEWER_NOT_ALLOWED;
   review must exist → 404 REVIEW_NOT_FOUND; review.userId ≠ userId → 403 REVIEW_NOT_OWNER;
   apply fields via Review.update (same star/content invariants as create); save in transaction;
   resolve targetOwnerId: USER → targetId; PRODUCT → product query port findOwnerById(targetId).userId)
  → emits `review.review.updated` { reviewId, targetOwnerId, star } after commit (only fields the notification handler uses)
  → notification module handles → notification.CreateNotification({ userId: targetOwnerId, type: REVIEW, referenceId: reviewId, label, content })
  → 200 (null body)

- [x] 1. [domain-model]       review: Review.update({ content?, star? }) reusing invariants, Review.assertOwnedBy(userId); errors REVIEW_NOT_FOUND (NOT_FOUND), REVIEW_NOT_OWNER (FORBIDDEN)
- [x] 2. [use-case]           review: UpdateReview, port IReviewRepository.findById (+ existing save, IUserQueryPort.findRoleById, IProductQueryPort.findOwnerById)
- [x] 3. [persistence]        review: PgReviewRepository.findById (no migration)
- [x] 4. [integration-event]  UpdateReview emits `review.review.updated`
- [x] 5. [event-handler]      notification: `review.review.updated` → CreateNotification (type REVIEW)
- [x] 6. [http]               PATCH /reviews/:reviewId (guarded) → 200 null body
- [ ] 7. [api-docs]           PATCH /reviews/:reviewId (auth: true)
- [ ] 8. [boundary-review]

## Decisions (defaults — change if wrong)
- Reviewer must still be ACTIVE FARMER (same check as create; locked farmer cannot edit).
- Not owner → 403 REVIEW_NOT_OWNER (not 404 masking), same as PRODUCT_NOT_OWNER.
- Target state not re-checked for edit (inactive product / distributor still editable). Owner lookup only for notification.
- PRODUCT target no longer exists (product deleted) → update still succeeds, no event published (no one to notify).
- Neither content nor star given → no-op: 200, nothing saved, no event.
- No `updatedAt` column (entity has none; not in response).
- Notification: label "Đánh giá được cập nhật", content "Một đánh giá đã được cập nhật thành {star} sao".

## Open questions
- none (approved: notification wording, deleted product → skip notification)
