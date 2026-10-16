import { DomainException, EDomainErrorType } from '@shared/domain';

/** Crop is unknown or not enabled for diagnosis. */
export class DiagnosisCropNotSupportedException extends DomainException {
  constructor(cropType: string) {
    super(
      'DIAGNOSIS_CROP_NOT_SUPPORTED',
      `Crop ${cropType} is not supported for diagnosis`,
      EDomainErrorType.VALIDATION,
      { cropType },
    );
  }
}
