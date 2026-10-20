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
        'multipart/form-data: `images` = 1..`maxImages` files (jpg/png/webp, at most `maxImageBytes` bytes and ' +
        '`maxImageWidth` x `maxImageHeight` px each, see GET /diagnoses/settings; format checked by content), `meta` = JSON string `{ cropType, images: [{ plantPart }], note? }` ' +
        'with one entry per file in the same order; `cropType` from GET /knowledge/crops and each `plantPart` ' +
        "from that crop's `plantParts` (otherwise DIAGNOSIS_INVALID_IMAGE). " +
        'Answers 202 with status PROCESSING; the result comes via ' +
        'realtime `diagnosis.completed` { id, status } or by polling GET /diagnoses/{diagnosisId}. ' +
        'Daily limit per user: `dailyFreeLimit` of the admin diagnosis settings (Vietnam day).',
      auth: true,
      validation: true,
      multipart: {
        required: ['images', 'meta'],
        fields: {
          images: {
            kind: 'files',
            description: '1..maxImages photos (GET /diagnoses/settings)',
          },
          meta: {
            kind: 'text',
            description:
              'JSON: { "cropType": "RICE", "images": [{ "plantPart": "LEAF" }], "note": "..." }; ' +
              "plantPart: one of the crop's plantParts (GET /knowledge/crops)",
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
    settings: {
      summary: 'Get the diagnosis form settings (public)',
      description:
        'No login needed; the access token is optional (an invalid one → 401). ' +
        'Default crop to preselect (null = none), image count range and per-image limits as sent ' +
        '(bytes, pixel width/height after EXIF orientation). Resize larger photos before POST /diagnoses; ' +
        'images over a limit answer DIAGNOSIS_INVALID_IMAGE with the image index. ' +
        "`remainingToday`: diagnoses the caller may still send today (`dailyFreeLimit` minus the caller's " +
        'diagnoses since 00:00 UTC+7, at least 0); null without an access token.',
      auth: true,
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
