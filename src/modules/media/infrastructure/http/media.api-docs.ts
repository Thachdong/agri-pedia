import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { MediaController } from './media.controller';

defineApiDocs(MediaController, {
  tag: 'Media',
  operations: {
    presignUrl: {
      summary: 'Get a signed URL to upload a file to TMP storage',
      description:
        'Allowed extensions: IMAGE jpg/jpeg/png/webp, VIDEO mp4/mov, FILE pdf (case-insensitive, leading dot ignored). ' +
        'Upload with `PUT <presignUrl>` sending exactly the returned `headers` (Content-Type and ' +
        '`x-goog-content-length-range`); the storage rejects a different Content-Type, a file over 10 MB, ' +
        'or an expired URL. Keep `key` to confirm the upload later.',
      validation: true,
      auth: true,
      errors: [
        {
          type: EDomainErrorType.VALIDATION,
          code: 'MEDIA_INVALID_EXTENSION',
        },
      ],
    },
  },
});
