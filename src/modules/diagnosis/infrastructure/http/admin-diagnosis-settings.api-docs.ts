import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AdminDiagnosisSettingsController } from './admin-diagnosis-settings.controller';

const ADMIN = {
  type: EDomainErrorType.FORBIDDEN,
  code: 'DIAGNOSIS_ADMIN_REQUIRED',
};

defineApiDocs(AdminDiagnosisSettingsController, {
  tag: 'Admin Diagnosis Settings',
  operations: {
    get: {
      summary: 'Get the diagnosis settings (admin)',
      description:
        'Defaults until saved: dailyFreeLimit 3, defaultCropType null, maxImages 5, maxImageBytes 5242880, ' +
        'maxImageWidth / maxImageHeight 4096.',
      auth: true,
      errors: [ADMIN],
    },
    update: {
      summary: 'Replace the diagnosis settings (admin)',
      description:
        'Every field is required. Ranges: dailyFreeLimit 1..1000, maxImages 1..10, maxImageBytes 102400..20971520, ' +
        'maxImageWidth / maxImageHeight 256..8192 (DIAGNOSIS_INVALID_SETTINGS with `details.field` otherwise). ' +
        '`defaultCropType` must be a crop enabled for diagnosis, or null.',
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'DIAGNOSIS_INVALID_SETTINGS',
        },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'DIAGNOSIS_CROP_NOT_SUPPORTED',
        },
      ],
    },
    getModels: {
      summary: 'Get the AI models of the diagnosis steps (admin)',
      description:
        'describeModel (B1) / verifyModel (B3): model picked by an admin, null = the env model in `defaults` is used.',
      auth: true,
      errors: [ADMIN],
    },
    updateModels: {
      summary: 'Replace the AI models of the diagnosis steps (admin)',
      description:
        'Both fields are required; null = use the env model. Model id: letters, digits, `.`, `_`, `-`, ' +
        'at most 100 characters, not starting with `.`, `_` or `-` (DIAGNOSIS_INVALID_SETTINGS with `details.field` ' +
        'otherwise). The id is not checked against the provider: an unknown model makes diagnoses fail. ' +
        'Applies to diagnoses created afterwards.',
      auth: true,
      validation: true,
      errors: [
        ADMIN,
        {
          type: EDomainErrorType.VALIDATION,
          code: 'DIAGNOSIS_INVALID_SETTINGS',
        },
      ],
    },
  },
});
