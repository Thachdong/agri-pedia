import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AdminProductCatalogController } from './admin-product-catalog.controller';

const ADMIN_REQUIRED = {
  type: EDomainErrorType.FORBIDDEN,
  code: 'PRODUCT_ADMIN_REQUIRED',
};

const CATEGORY_NOT_FOUND = {
  type: EDomainErrorType.NOT_FOUND,
  code: 'PRODUCT_CATEGORY_NOT_FOUND',
};

defineApiDocs(AdminProductCatalogController, {
  tag: 'Admin Product Catalog',
  operations: {
    list: {
      summary: 'List catalog items (product suggestion knowledge base)',
      description:
        'Sorted by name; `search` matches part of the name ignoring case, diacritics and punctuation. Page-based (`page` 1-based, `limit` 1..100, default 20).',
      auth: true,
      validation: true,
      errors: [ADMIN_REQUIRED],
    },
    create: {
      summary: 'Add a catalog item',
      description:
        'Suggested to distributors whose photo shows this name. The name is unique ignoring case, diacritics and punctuation. Optional `categoryId` (from `GET /categories`) and `unit` are suggested too, to preselect the product form.',
      auth: true,
      validation: true,
      errors: [
        ADMIN_REQUIRED,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'PRODUCT_CATALOG_ITEM_INVALID',
        },
        CATEGORY_NOT_FOUND,
        {
          type: EDomainErrorType.CONFLICT,
          code: 'PRODUCT_CATALOG_ITEM_NAME_TAKEN',
        },
      ],
    },
    update: {
      summary: 'Change a catalog item (omitted fields are kept)',
      description: '`categoryId` / `unit`: null clears them.',
      auth: true,
      validation: true,
      errors: [
        ADMIN_REQUIRED,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'PRODUCT_CATALOG_ITEM_INVALID',
        },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'PRODUCT_CATALOG_ITEM_NOT_FOUND',
        },
        CATEGORY_NOT_FOUND,
        {
          type: EDomainErrorType.CONFLICT,
          code: 'PRODUCT_CATALOG_ITEM_NAME_TAKEN',
        },
      ],
    },
    delete: {
      summary: 'Delete a catalog item for good',
      description: 'Empty body. Products already listed are not affected.',
      auth: true,
      validation: true,
      errors: [
        ADMIN_REQUIRED,
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'PRODUCT_CATALOG_ITEM_NOT_FOUND',
        },
      ],
    },
  },
});
