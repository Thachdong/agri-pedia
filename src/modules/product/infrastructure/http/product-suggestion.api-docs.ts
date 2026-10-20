import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ProductSuggestionController } from './product-suggestion.controller';

defineApiDocs(ProductSuggestionController, {
  tag: 'Product',
  operations: {
    suggest: {
      summary: 'Suggest product name + description from a photo of its label',
      description:
        'multipart/form-data: `image` = 1 photo (jpg/png/webp, at most 5MB; format checked by content), focused on the product name. ' +
        'The photo is not stored. Distributor only. Answers 200 with `status`: ' +
        'UNREADABLE (no name read: retake or type it), NOT_FOUND (`detectedName` read but not in the catalog), ' +
        'FOUND (`suggestion` { name, description } to prefill the product form). ' +
        '`remaining` = suggestions left for the caller (lifetime quota, set by admins); ' +
        'over 5MB the upload is refused with 413.',
      auth: true,
      multipart: {
        required: ['image'],
        fields: {
          image: { kind: 'files', description: 'One product photo' },
        },
      },
      errors: [
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'PRODUCT_SELLER_NOT_ALLOWED',
        },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'PRODUCT_SUGGESTION_INVALID_IMAGE',
        },
        {
          type: EDomainErrorType.BUSINESS_RULE,
          code: 'PRODUCT_SUGGESTION_QUOTA_EXCEEDED',
        },
      ],
    },
  },
});
