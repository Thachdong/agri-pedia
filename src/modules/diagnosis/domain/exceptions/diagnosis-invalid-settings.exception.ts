import { DomainException, EDomainErrorType } from '@shared/domain';

/** A diagnosis setting is out of its allowed range. */
export class DiagnosisInvalidSettingsException extends DomainException {
  constructor(field: string, reason: string) {
    super(
      'DIAGNOSIS_INVALID_SETTINGS',
      `Invalid diagnosis setting ${field}: ${reason}`,
      EDomainErrorType.VALIDATION,
      { field, reason },
    );
  }
}
