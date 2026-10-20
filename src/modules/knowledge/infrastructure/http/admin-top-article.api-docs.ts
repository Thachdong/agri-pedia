import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AdminTopArticleController } from './admin-top-article.controller';

const ADMIN = {
  type: EDomainErrorType.FORBIDDEN,
  code: 'KNOWLEDGE_ADMIN_REQUIRED',
};
const CROP_NOT_FOUND = {
  type: EDomainErrorType.NOT_FOUND,
  code: 'KNOWLEDGE_CROP_NOT_FOUND',
};

defineApiDocs(AdminTopArticleController, {
  tag: 'Admin Top Articles',
  operations: {
    settings: {
      summary: 'Get the top articles settings (admin)',
      description: '`limit` defaults to 10 until saved.',
      auth: true,
      errors: [ADMIN],
    },
    updateSettingsOf: {
      summary: 'Change the number of top articles per crop (admin)',
      description:
        '`limit` 1..50. Lists already longer stay as they are; the public list shows their first `limit` articles.',
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'KNOWLEDGE_INVALID_TOP_ARTICLE_SETTINGS',
        },
      ],
    },
    topArticles: {
      summary: 'Get the top articles of a crop (admin)',
      description:
        'In order, with the current `limit`. Articles unpublished since they were chosen stay listed (`isPublished` false); ' +
        'the public list skips them.',
      auth: true,
      validation: true,
      errors: [ADMIN, CROP_NOT_FOUND],
    },
    setTopArticlesOf: {
      summary: 'Replace the top articles of a crop (admin)',
      description:
        '`articleSlugs` in order (first = top), at most `limit`, each a published article of the crop, no duplicates; ' +
        'an empty list clears it. KNOWLEDGE_TOP_ARTICLES_INVALID `details` = { reason, articles } with the offending slugs.',
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        CROP_NOT_FOUND,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'KNOWLEDGE_TOP_ARTICLES_INVALID',
        },
      ],
    },
  },
});
