import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { KnowledgeController } from './knowledge.controller';

defineApiDocs(KnowledgeController, {
  tag: 'Knowledge',
  operations: {
    crops: {
      summary: 'List crops supported by diagnosis (public)',
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
        'No chemical recommendations. When `verification` is not SOURCED, show that experts have not confirmed the content yet.',
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
