import { DomainException, EDomainErrorType } from '@shared/domain';
import { EMediaType } from '../enums/media-type.enum';

export type TInvalidMediaExtension = {
  /** Position of the file in the request. */
  index: number;
  type: EMediaType;
  extension: string;
  allowed: string[];
};

export class InvalidMediaExtensionException extends DomainException {
  constructor(files: TInvalidMediaExtension[]) {
    super(
      'MEDIA_INVALID_EXTENSION',
      `Extension not allowed for ${files.length} file(s): ${files
        .map((f) => `#${f.index} ${f.type} "${f.extension}"`)
        .join(', ')}`,
      EDomainErrorType.VALIDATION,
      { files },
    );
  }
}
