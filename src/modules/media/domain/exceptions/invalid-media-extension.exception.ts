import { DomainException, EDomainErrorType } from '@shared/domain';
import { EMediaType } from '../enums/media-type.enum';

export class InvalidMediaExtensionException extends DomainException {
  constructor(type: EMediaType, extension: string, allowed: string[]) {
    super(
      'MEDIA_INVALID_EXTENSION',
      `Extension "${extension}" is not allowed for ${type} (allowed: ${allowed.join(', ')})`,
      EDomainErrorType.VALIDATION,
      { type, extension, allowed },
    );
  }
}
