import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { KnowledgeController } from './knowledge.controller';

defineApiDocs(KnowledgeController, {
  tag: 'Knowledge',
  operations: {
    crops: {
      summary: 'List crops supported by diagnosis (public)',
      description:
        'Enabled crops by display order. `plantParts` = the parts a photo of the crop may show (values for ' +
        'POST /diagnoses `images[].plantPart`, dropdown order); `cropStages` = labels of the stage codes used by its diseases.',
    },
    diseases: {
      summary: 'List diseases of a crop, by Vietnamese name (public)',
      description:
        'Filter by category; `q` matches Vietnamese/English names and aliases, ignoring case and diacritics. No pagination (~50 per crop).',
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'KNOWLEDGE_CROP_NOT_FOUND' },
      ],
    },
    disease: {
      summary: 'Get the Vietnamese detail of a disease (public)',
      description:
        'No chemical recommendations. When `verification` is not SOURCED, show that experts have not confirmed the content yet. ' +
        "`article` = path and status of the disease's article (GET /knowledge/articles/:cropSlug/:slug), null when it has none.",
      validation: true,
      errors: [
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'KNOWLEDGE_DISEASE_NOT_FOUND',
        },
      ],
    },
  },
});
