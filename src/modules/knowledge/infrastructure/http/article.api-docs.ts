import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ArticleController } from './article.controller';

const CACHE_NOTE = ' Sent with `Cache-Control: public, max-age=60`.';

defineApiDocs(ArticleController, {
  tag: 'Articles',
  operations: {
    crops: {
      summary: 'List crops that have disease articles (public)',
      description:
        'Crops with at least one article, by display order, including crops not yet enabled for diagnosis ' +
        '(`diagnosisEnabled` = false). `slug` is the value for `crop` of GET /knowledge/articles.' +
        CACHE_NOTE,
    },
    sitemap: {
      summary: 'List indexable articles for the sitemap (public)',
      description:
        "REVIEWED, published articles only, unpaginated; `crops[].updatedAt` = latest update of the crop's articles." +
        CACHE_NOTE,
    },
    list: {
      summary: 'List article summaries of a crop, by title (public)',
      description:
        'Vietnamese title order, keyset-paginated (`nextCursor`). Unpublished articles are left out; DRAFT ones are included: render them noindex. ' +
        "`category` filters by the category of the article's disease. Variant articles are listed too (`variant` set)." +
        CACHE_NOTE,
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'KNOWLEDGE_CROP_NOT_FOUND' },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'KNOWLEDGE_ARTICLE_INVALID_CURSOR',
        },
      ],
    },
    detail: {
      summary: 'Get a disease article, ready to render (public)',
      description:
        '`markdown` has public image URLs and `/diseases/<CODE>` links turned into article paths ' +
        "(a variant id without its own article links to the disease's main article; plain text when there is no article); " +
        'a variant article has `variant` + `parentArticle` (breadcrumb), a main article lists `variantArticles` (each with its `coverUrl`); every article has a 16:9 `cover` (cards, Open Graph); directives `:::warning`, `:::tip`, ' +
        '`::disease-card{code="..."}` and `::cta-diagnosis` stay for the client. `relatedDiseases` feeds the cards. ' +
        'An unpublished article answers 404 and counts as no article in links.' +
        CACHE_NOTE,
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'KNOWLEDGE_CROP_NOT_FOUND' },
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'KNOWLEDGE_ARTICLE_NOT_FOUND',
        },
      ],
    },
  },
});
