import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AdminProductSuggestionController } from './admin-product-suggestion.controller';

const ADMIN_REQUIRED = {
  type: EDomainErrorType.FORBIDDEN,
  code: 'PRODUCT_ADMIN_REQUIRED',
};

defineApiDocs(AdminProductSuggestionController, {
  tag: 'Admin Product Suggestion',
  operations: {
    get: {
      summary: 'Get the product suggestion quotas',
      description:
        'Defaults (50 / 50) until saved. Lifetime quotas per distributor, never reset.',
      auth: true,
      errors: [ADMIN_REQUIRED],
    },
    update: {
      summary: 'Replace the product suggestion quotas',
      description:
        '`invalidImageLimit` (1..10000): suggestions a distributor sees as its quota, charged by UNREADABLE and FOUND. ' +
        '`notFoundLimit` (0..10000): hidden bonus charged by NOT_FOUND first (then the visible quota); ' +
        'raise it while the catalog is thin. Applies to what distributors already used.',
      auth: true,
      validation: true,
      errors: [
        ADMIN_REQUIRED,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'PRODUCT_SUGGESTION_INVALID_SETTINGS',
        },
      ],
    },
    getModel: {
      summary: 'Get the AI model that reads product names',
      description:
        '`model`: picked by an admin; null = the env model in `defaults.model` is used.',
      auth: true,
      errors: [ADMIN_REQUIRED],
    },
    updateModel: {
      summary: 'Replace the AI model that reads product names',
      description:
        '`model` is required; null = use the env model. Model id: letters, digits, `.`, `_`, `-`, ' +
        'at most 100 characters, not starting with `.`, `_` or `-` (PRODUCT_SUGGESTION_INVALID_SETTINGS otherwise). ' +
        'The id is not checked against the provider: an unknown model makes suggestions fail. ' +
        'Applies to the next suggestion.',
      auth: true,
      validation: true,
      errors: [
        ADMIN_REQUIRED,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'PRODUCT_SUGGESTION_INVALID_SETTINGS',
        },
      ],
    },
    misses: {
      summary: 'List product names read from photos but missing in the catalog',
      description:
        'Grouped by normalized name: count, distinct distributors, last seen; most frequent first. ' +
        'Page-based (`page` 1-based, `limit` 1..100, default 20).',
      auth: true,
      validation: true,
      errors: [ADMIN_REQUIRED],
    },
  },
});
