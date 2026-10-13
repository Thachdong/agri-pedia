import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { DiagnosisController } from './diagnosis.controller';

defineApiDocs(DiagnosisController, {
  tag: 'Diagnosis',
  operations: {
    create: {
      summary:
        'Send plant photos for disease diagnosis (processed in background)',
      description:
        'multipart/form-data: `images` = 1..5 files (jpg/png/webp, <= DIAGNOSIS_MAX_IMAGE_BYTES each; ' +
        'format checked by content), `meta` = JSON string `{ cropType, images: [{ plantPart }], note? }` ' +
        'with one entry per file in the same order. Answers 202 with status PROCESSING; the result comes via ' +
        'realtime `diagnosis.completed` { id, status } or by polling GET /diagnoses/{diagnosisId}. ' +
        'Daily limit per user: DIAGNOSIS_DAILY_LIMIT (Vietnam day).',
      auth: true,
      validation: true,
      multipart: {
        required: ['images', 'meta'],
        fields: {
          images: { kind: 'files', description: '1..5 photos' },
          meta: {
            kind: 'text',
            description:
              'JSON: { "cropType": "RICE", "images": [{ "plantPart": "LEAF" }], "note": "..." }; ' +
              'plantPart: LEAF | SHEATH | STEM | PANICLE | ROOT | WHOLE_PLANT',
          },
        },
      },
      errors: [
        {
          type: EDomainErrorType.FORBIDDEN,
          code: 'DIAGNOSIS_USER_NOT_ALLOWED',
        },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'DIAGNOSIS_CROP_NOT_SUPPORTED',
        },
        { type: EDomainErrorType.VALIDATION, code: 'DIAGNOSIS_INVALID_IMAGE' },
        {
          type: EDomainErrorType.BUSINESS_RULE,
          code: 'DIAGNOSIS_DAILY_LIMIT_EXCEEDED',
        },
      ],
    },
    listMine: {
      summary: 'List my diagnoses, newest first',
      description:
        'Cursor pagination. `thumbnail` = signed URL of the first stored image; `diseases` empty while PROCESSING or when FAILED.',
      auth: true,
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'DIAGNOSIS_INVALID_CURSOR' },
      ],
    },
    get: {
      summary: 'Get one of my diagnoses with per-image results',
      description:
        'While PROCESSING: `summary` null, image `status` null, `regions` empty. Region `box` is 0..1 on the ' +
        'stored (EXIF-rotated) image at `url`; `diagnosis` null = uncertain region. Use `diseaseCode` with ' +
        "GET /knowledge/diseases/{code}. Another user's diagnosis answers 404.",
      auth: true,
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'DIAGNOSIS_NOT_FOUND' },
      ],
    },
    feedback: {
      summary: 'Give feedback on a completed diagnosis (overwrites)',
      description: 'Empty body (null) on success.',
      auth: true,
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'DIAGNOSIS_NOT_FOUND' },
        { type: EDomainErrorType.CONFLICT, code: 'DIAGNOSIS_NOT_COMPLETED' },
      ],
    },
  },
});
