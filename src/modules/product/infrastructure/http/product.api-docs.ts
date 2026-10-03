import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ProductController } from './product.controller';

defineApiDocs(ProductController, {
  tag: 'Product',
  operations: {
    listByDistributor: {
      summary: "List a distributor's products (public)",
      description:
        'No login needed. Lists the ACTIVE, not deleted products of `distributorId`, newest first ' +
        '(INACTIVE / OUT_OF_STOCK are hidden). `limit` 1..50, default 20. To get the next page pass the ' +
        'returned `nextCursor` as `cursor` (same `distributorId`); `nextCursor` is null on the last page. ' +
        '`thumbnail` is a signed URL of the first image (expires after the configured TTL, default 1h), ' +
        'or null when the product has no image. `distributorId` that is not a DISTRIBUTOR → 404.',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'PRODUCT_INVALID_CURSOR' },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'PRODUCT_DISTRIBUTOR_NOT_FOUND',
        },
      ],
    },
    getDetail: {
      summary: 'Get a product detail (public)',
      description:
        'No login needed. Returns the product in any status (ACTIVE / INACTIVE / OUT_OF_STOCK) with its seller ' +
        '`distributorId` and every media (IMAGE / VIDEO / FILE) ordered by `sortOrder`. Each `url` is a signed URL ' +
        '(expires after the configured TTL, default 1h). A deleted product → 404. Rating: `GET /reviews/summary`.',
      validation: true,
      errors: [{ type: EDomainErrorType.NOT_FOUND, code: 'PRODUCT_NOT_FOUND' }],
    },
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
      description:
        'Caller must be a DISTRIBUTOR whose account is ACTIVE (else 403 `PRODUCT_SELLER_NOT_ALLOWED`) and the ' +
        'seller of the product (else 403 `PRODUCT_NOT_OWNER`). Every field is optional: omitted fields keep ' +
        'their value, `null` is rejected. Same rules as create for `price`, `quantity`, `unit`, `categoryId`; ' +
        '`status` is ACTIVE | INACTIVE | OUT_OF_STOCK. `addMedia` (0..10): files uploaded via ' +
        '`POST /media/presign-url`, moved out of TMP and attached; an item that cannot be attached is skipped and ' +
        'logged. `removeMediaIds` (0..10): media of this product to delete (record and stored file); ids of ' +
        'other products are ignored. Returns an empty body.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'PRODUCT_INVALID_PRICE' },
        { type: EDomainErrorType.VALIDATION, code: 'PRODUCT_INVALID_QUANTITY' },
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'PRODUCT_SELLER_NOT_ALLOWED',
        },
        { type: EDomainErrorType.FORBIDDEN, code: 'PRODUCT_NOT_OWNER' },
        { type: EDomainErrorType.NOT_FOUND, code: 'PRODUCT_NOT_FOUND' },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'PRODUCT_CATEGORY_NOT_FOUND',
        },
      ],
    },
    delete: {
      summary: 'Delete own product (ACTIVE distributor only)',
      description:
        'Caller must be a DISTRIBUTOR whose account is ACTIVE (else 403 `PRODUCT_SELLER_NOT_ALLOWED`) and the ' +
        'seller of the product (else 403 `PRODUCT_NOT_OWNER`). Soft delete: the product is kept for history but ' +
        'treated as missing afterwards (update/delete → 404 `PRODUCT_NOT_FOUND`). All its media (records and ' +
        'stored files) are removed. Returns an empty body.',
      validation: true,
      auth: true,
      errors: [
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'PRODUCT_SELLER_NOT_ALLOWED',
        },
        { type: EDomainErrorType.FORBIDDEN, code: 'PRODUCT_NOT_OWNER' },
        { type: EDomainErrorType.NOT_FOUND, code: 'PRODUCT_NOT_FOUND' },
      ],
    },
  },
});
