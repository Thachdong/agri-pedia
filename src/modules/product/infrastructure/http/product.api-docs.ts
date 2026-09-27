import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ProductController } from './product.controller';

defineApiDocs(ProductController, {
  tag: 'Product',
  operations: {
    create: {
      summary: 'Create a product (ACTIVE distributor only)',
      description:
        'Caller must be a DISTRIBUTOR whose account is ACTIVE, otherwise 403 `PRODUCT_SELLER_NOT_ALLOWED`. ' +
        '`categoryId` comes from `GET /categories`. `price` >= 0 with at most 2 decimals; `quantity` integer >= 0. ' +
        'Upload files first: `POST /media/presign-url`, PUT each file to its URL, then send 1..10 `media` items ' +
        'with the returned `key` and the same `type`/`extension`. The product is created ACTIVE and each file is ' +
        'moved out of TMP and attached to it. A media item that cannot be attached (key of another user, extension ' +
        'mismatch, file not uploaded) is skipped and logged; the product is still created.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'PRODUCT_INVALID_PRICE' },
        { type: EDomainErrorType.VALIDATION, code: 'PRODUCT_INVALID_QUANTITY' },
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'PRODUCT_SELLER_NOT_ALLOWED',
        },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'PRODUCT_CATEGORY_NOT_FOUND',
        },
      ],
    },
    update: {
      summary: 'Update own product (ACTIVE distributor only)',
      validation: true,
      auth: true,
    },
  },
});
