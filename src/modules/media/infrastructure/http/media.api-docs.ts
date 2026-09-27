import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { MediaController } from './media.controller';

defineApiDocs(MediaController, {
  tag: 'Media',
  operations: {
    presignUrl: {
      summary: 'Get signed URLs to upload 1..10 files to TMP storage',
      description:
        'Send 1..10 `files`; returns one `items` entry per file, in the same order. ' +
        'Allowed extensions: IMAGE jpg/jpeg/png/webp, VIDEO mp4/mov, FILE pdf (case-insensitive, leading dot ignored). ' +
        'All-or-nothing: if any file has an extension not allowed for its type, responds 400 ' +
        '`MEDIA_INVALID_EXTENSION` with `details.files: [{ index, type, extension, allowed }]` listing every ' +
        'invalid file, and no URL is issued. ' +
        'Upload each file with `PUT <presignUrl>` sending exactly its `headers` (Content-Type and ' +
        '`x-goog-content-length-range`); the storage rejects a different Content-Type, a file over 10 MB, ' +
        'or an expired URL. Keep each `key` to confirm the upload later.',
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
