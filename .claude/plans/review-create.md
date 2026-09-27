# Feature: Add review (FARMER reviews DISTRIBUTOR or product)

Source: specs/api.md §15 add review; entities §4 Notification, §10 Review.

Flow: `POST /reviews { targetType: PRODUCT | USER, targetId, content, star: 1..5 }` + `Authorization: Bearer <accessToken>` (review module)
  → AccessTokenGuard (401) → review.CreateReview({ userId, ... })
  (user query port findRoleById(userId): not FARMER or not ACTIVE → 403 REVIEW_REVIEWER_NOT_ALLOWED;
   resolve targetOwnerId:
     USER    → user query port findRoleById(targetId): missing → 404 REVIEW_TARGET_NOT_FOUND; not DISTRIBUTOR or not ACTIVE → 422 REVIEW_INVALID_TARGET; owner = targetId
     PRODUCT → product query port findOwnerById(targetId): missing → 404 REVIEW_TARGET_NOT_FOUND; not ACTIVE → 422 REVIEW_INVALID_TARGET; owner = product.userId
   review exists for (userId, targetType, targetId) → 409 REVIEW_ALREADY_EXISTS;
   save Review in transaction)
  → emits `review.review.created` { reviewId, reviewerId, targetType, targetId, targetOwnerId, star } after commit
  → notification module handles → notification.CreateNotification({ userId: targetOwnerId, type: REVIEW, referenceId: reviewId, label, content })
  → 201 { reviewId }

- [x] 1. [module-scaffold]    modules `review`, `notification`
- [x] 2. [domain-model]       review: Review (star integer 1..5, content non-empty), EReviewTargetType; errors REVIEW_INVALID_STAR, REVIEW_INVALID_CONTENT, REVIEW_REVIEWER_NOT_ALLOWED (FORBIDDEN), REVIEW_TARGET_NOT_FOUND (NOT_FOUND), REVIEW_INVALID_TARGET, REVIEW_ALREADY_EXISTS (CONFLICT)
- [x] 3. [domain-model]       notification: Notification (isRead=false on create), ENotificationType (PLATFORM | REVIEW)
- [x] 4. [query-port]         product: IProductQueryPort.findOwnerById(productId) → { productId, userId, isActive }; consumed by review (user IUserQueryPort.findRoleById reused)
- [x] 5. [use-case]           review: CreateReview, port IReviewRepository.save + existsByAuthorAndTarget
- [x] 6. [use-case]           notification: CreateNotification, port INotificationRepository.save
- [x] 7. [persistence]        review: PgReviewRepository; table `reviews` (unique user_id + target_type + target_id)
- [x] 8. [persistence]        notification: PgNotificationRepository; table `notifications`
- [x] 9. [integration-event]  CreateReview emits `review.review.created`
- [x] 10. [event-handler]     notification: `review.review.created` → CreateNotification (type REVIEW)
- [ ] 11. [http]              POST /reviews (guarded)
- [ ] 12. [api-docs]          POST /reviews (auth: true)
- [ ] 13. [boundary-review]

Order note: query-port (4) before CreateReview (5) because the use case depends on it.

## Decisions (defaults — change if wrong)
- Reviewer role/status via user query port (token has only `userId`), same as CreateProduct. Reviewer must be ACTIVE FARMER.
- USER target must be ACTIVE DISTRIBUTOR (PENDING distributor = invalid target).
- PRODUCT target: must exist and be ACTIVE (INACTIVE / OUT_OF_STOCK → REVIEW_INVALID_TARGET) (approved).
- Duplicate guard: use-case check + DB unique index (race → mapped to REVIEW_ALREADY_EXISTS in repository).
- Notification created async via event (cross-module writes only via events). Response returns before notification row exists.
- Notification `label` = "Đánh giá mới", `content` = "Bạn nhận được đánh giá {star} sao" (star in event payload) — built in notification handler/use case. (approved)
- content length: 1..1000 chars (trimmed).
- No review images (spec §15 input has no media).

## Open questions
- none (answered: notification wording OK, only ACTIVE products)
