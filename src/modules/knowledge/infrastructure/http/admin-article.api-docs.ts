import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AdminArticleController } from './admin-article.controller';

const ADMIN = {
  type: EDomainErrorType.FORBIDDEN,
  code: 'KNOWLEDGE_ADMIN_REQUIRED',
};
const ARTICLE_NOT_FOUND = {
  type: EDomainErrorType.NOT_FOUND,
  code: 'KNOWLEDGE_ARTICLE_NOT_FOUND',
};
const CROP_NOT_FOUND = {
  type: EDomainErrorType.NOT_FOUND,
  code: 'KNOWLEDGE_CROP_NOT_FOUND',
};
const INVALID_CONTENT = {
  type: EDomainErrorType.VALIDATION,
  code: 'KNOWLEDGE_ARTICLE_INVALID_CONTENT',
};
const IMAGE_INVALID = {
  type: EDomainErrorType.VALIDATION,
  code: 'KNOWLEDGE_ARTICLE_IMAGE_INVALID',
};

const CONTENT_NOTE =
  ' Content rules (`details.issues` of KNOWLEDGE_ARTICLE_INVALID_CONTENT lists every broken one): title 1-70 chars, ' +
  'summary 50-160 chars, image `file` names `^[a-z0-9-]+\\.webp$` without duplicates, `cover` one of them, every body image ' +
  '(`![alt](<file>)`) listed, `/diseases/<CODE>` links and `::disease-card{code="..."}` (disease ids only) inside the crop KB, ' +
  'no HTML outside code. A new image is a key from POST /media/presign-url (jpg, png or webp, uploaded by the caller); ' +
  'it is stored as webp at most 1600px wide. The client page cache is revalidated in the background.';

defineApiDocs(AdminArticleController, {
  tag: 'Admin Articles',
  operations: {
    targets: {
      summary: 'List the diseases of a crop with their articles (admin)',
      description:
        'Every disease of the crop by Vietnamese name, each followed by its variants (KB order). `article` is the article ' +
        'in any visibility (`origin` AI | ADMIN | AI_REVIEWED, `isPublished`), or null when none is written yet: create it ' +
        'with POST /admin/knowledge/articles and `code`.',
      auth: true,
      validation: true,
      errors: [ADMIN, CROP_NOT_FOUND],
    },
    detail: {
      summary: 'Get the stored content of an article (admin)',
      description:
        '`code` = variant code, else disease code (main article). Published or not. `markdown` is as stored (image file ' +
        'names, `/diseases/<CODE>` links): send it back as is in PUT. `images[].url` is the public URL to preview.',
      auth: true,
      validation: true,
      errors: [ADMIN, ARTICLE_NOT_FOUND, CROP_NOT_FOUND],
    },
    create: {
      summary: 'Write the article of a disease or variant without one (admin)',
      description:
        'Created published, `origin` ADMIN, `status` REVIEWED by the caller. `slug` is fixed afterwards and unique in the ' +
        'crop. A variant article needs the main article of its disease. Every image needs a `tmpKey`.' +
        CONTENT_NOTE,
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'KNOWLEDGE_DISEASE_NOT_FOUND',
        },
        CROP_NOT_FOUND,
        {
          type: EDomainErrorType.CONFLICT,
          code: 'KNOWLEDGE_ARTICLE_ALREADY_EXISTS',
        },
        {
          type: EDomainErrorType.CONFLICT,
          code: 'KNOWLEDGE_ARTICLE_SLUG_TAKEN',
        },
        INVALID_CONTENT,
        IMAGE_INVALID,
      ],
    },
    update: {
      summary: 'Replace the content of an article (admin)',
      description:
        'Slug, crop and code stay; visibility is kept. `images` is the full list: an entry without `tmpKey` keeps the stored ' +
        'image of that `file` (alt / caption / credit updated), images left out are dropped. The article becomes REVIEWED ' +
        'by the caller; an AI article becomes AI_REVIEWED and the crop pack seed no longer overwrites it.' +
        CONTENT_NOTE,
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        ARTICLE_NOT_FOUND,
        CROP_NOT_FOUND,
        INVALID_CONTENT,
        IMAGE_INVALID,
      ],
    },
    unpublish: {
      summary: 'Hide an article from the public API (admin)',
      description:
        'The page answers 404, the article leaves lists, counts, the sitemap and disease detail, and links to it render as ' +
        'plain text. It stays editable. Already hidden = no-op.',
      auth: true,
      validation: true,
      errors: [ADMIN, ARTICLE_NOT_FOUND, CROP_NOT_FOUND],
    },
    publish: {
      summary: 'Show an unpublished article again (admin)',
      description: 'Already published = no-op.',
      auth: true,
      validation: true,
      errors: [ADMIN, ARTICLE_NOT_FOUND, CROP_NOT_FOUND],
    },
  },
});
