import { DomainException, EDomainErrorType } from '@shared/domain';

export type TInvalidImage = {
  /** Index of the file as sent; null for a problem with the whole set (e.g. count). */
  index: number | null;
  reason: string;
};

/** Images are missing, too many, too large, unreadable, or do not match the plant parts. */
export class DiagnosisInvalidImageException extends DomainException {
  constructor(images: TInvalidImage[]) {
    super(
      'DIAGNOSIS_INVALID_IMAGE',
      'Invalid diagnosis images',
      EDomainErrorType.VALIDATION,
      { images },
    );
  }
}
