import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ReviewController } from './review.controller';

defineApiDocs(ReviewController, {
  tag: 'Review',
  operations: {
    listByDistributor: {
      summary: "List reviews of a distributor's shop (public)",
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
  },
});
