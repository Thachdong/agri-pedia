import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ReviewController } from './review.controller';

defineApiDocs(ReviewController, {
  tag: 'Review',
  operations: {
    listByDistributor: {
      summary: "List reviews of a distributor's shop (public)",
      description:
        'No login needed. Lists reviews of the distributor itself (USER) and of every product it ever listed ' +
        '(PRODUCT; any status, deleted products included), newest first. Filter with `targetType` and/or `star`. ' +
        '`summary` covers every review of the shop and is not affected by filters or cursor; `avgRating` has 1 ' +
        'decimal and is 0 when there is no review. `limit` 1..50, default 20. To get the next page pass the returned ' +
        '`nextCursor` as `cursor` with the same filters; `nextCursor` is null on the last page. `productName` is null ' +
        'for shop (USER) reviews. `user.avatar` is a signed URL (expires after the configured TTL, default 1h), or ' +
        'null. `distributorId` that is not a DISTRIBUTOR → 404.',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_CURSOR' },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'REVIEW_DISTRIBUTOR_NOT_FOUND',
        },
      ],
    },
    summary: {
      summary: 'Get the rating of a product or a distributor (public)',
      description:
        'No login needed. `targetType=PRODUCT`: reviews of that product. `targetType=USER`: reviews of the ' +
        'distributor itself only (not of its products; the whole shop summary is in `GET /reviews`). `avgRating` has ' +
        '1 decimal and is 0 when there is no review. A target without reviews, or that does not exist, returns all zero.',
      validation: true,
    },
    listByProduct: {
      summary: 'List reviews of a product (public)',
      description:
        'No login needed. Reviews of one product (any status; a deleted or unknown product → 404), newest first. ' +
        'Filter with `star`. `limit` 1..50, default 20. To get the next page pass the returned `nextCursor` as ' +
        '`cursor` with the same `star`; `nextCursor` is null on the last page. `user.avatar` is a signed URL ' +
        '(expires after the configured TTL, default 1h), or null. Rating of the product: `GET /reviews/summary`.',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_CURSOR' },
        { type: EDomainErrorType.NOT_FOUND, code: 'REVIEW_TARGET_NOT_FOUND' },
      ],
    },
    create: {
      summary:
        'Review a distributor or one of its products (ACTIVE farmer only)',
      description:
        'Caller must be a FARMER whose account is ACTIVE, otherwise 403 `REVIEW_REVIEWER_NOT_ALLOWED`. ' +
        '`targetType` USER: `targetId` is a distributor user id; it must be an ACTIVE DISTRIBUTOR. ' +
        '`targetType` PRODUCT: `targetId` is a product id; the product must be ACTIVE (deleted → 404, ' +
        'INACTIVE / OUT_OF_STOCK → 422). A farmer reviews each target once (second time → 409). ' +
        '`star` integer 1..5; `content` 1..1000 characters after trimming. ' +
        'On success the distributor (the shop itself, or the seller of the product) gets a REVIEW notification ' +
        'with `referenceId` = `reviewId`.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_STAR' },
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_CONTENT' },
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'REVIEW_REVIEWER_NOT_ALLOWED',
        },
        { type: EDomainErrorType.NOT_FOUND, code: 'REVIEW_TARGET_NOT_FOUND' },
        { type: EDomainErrorType.CONFLICT, code: 'REVIEW_ALREADY_EXISTS' },
        { type: EDomainErrorType.BUSINESS_RULE, code: 'REVIEW_INVALID_TARGET' },
      ],
    },
    update: {
      summary: 'Edit own review (ACTIVE farmer only)',
      description:
        'Caller must be a FARMER whose account is ACTIVE, otherwise 403 `REVIEW_REVIEWER_NOT_ALLOWED`. ' +
        'Only the author may edit the review (else 403 `REVIEW_NOT_OWNER`). Works for shop (USER) and ' +
        'product (PRODUCT) reviews; the target is not re-checked. Omitted fields keep their value; `null` ' +
        'is rejected. `star` integer 1..5; `content` 1..1000 characters after trimming. Empty body → 200, ' +
        'nothing changes. On change the distributor (the shop itself, or the seller of the product) gets a ' +
        'REVIEW notification with `referenceId` = `reviewId` (none if the product was deleted). Response body is null.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_STAR' },
        { type: EDomainErrorType.VALIDATION, code: 'REVIEW_INVALID_CONTENT' },
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'REVIEW_REVIEWER_NOT_ALLOWED',
        },
        { type: EDomainErrorType.FORBIDDEN, code: 'REVIEW_NOT_OWNER' },
        { type: EDomainErrorType.NOT_FOUND, code: 'REVIEW_NOT_FOUND' },
      ],
    },
  },
});
