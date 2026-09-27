import { DomainException, EDomainErrorType } from '@shared/domain';
import { EMediaType } from '../enums/media-type.enum';
import { InvalidMediaExtensionException } from '../exceptions/invalid-media-extension.exception';
import { MediaExtension } from './media-extension.vo';

describe('MediaExtension', () => {
  it.each([
    [EMediaType.IMAGE, 'jpg', 'image/jpeg'],
    [EMediaType.IMAGE, 'jpeg', 'image/jpeg'],
    [EMediaType.IMAGE, 'png', 'image/png'],
    [EMediaType.IMAGE, 'webp', 'image/webp'],
    [EMediaType.VIDEO, 'mp4', 'video/mp4'],
    [EMediaType.VIDEO, 'mov', 'video/quicktime'],
    [EMediaType.FILE, 'pdf', 'application/pdf'],
  ])('%s accepts %s as %s', (type, ext, contentType) => {
    const extension = MediaExtension.create(type, ext);
    expect(extension.value).toBe(ext);
    expect(extension.contentType).toBe(contentType);
  });

  it('normalizes case, whitespace and leading dot', () => {
    expect(MediaExtension.create(EMediaType.IMAGE, ' .PNG ').value).toBe('png');
  });

  it.each([
    [EMediaType.IMAGE, 'pdf'],
    [EMediaType.VIDEO, 'png'],
    [EMediaType.FILE, 'mp4'],
    [EMediaType.IMAGE, 'gif'],
    [EMediaType.IMAGE, ''],
    [EMediaType.IMAGE, 'constructor'],
    [EMediaType.IMAGE, 'png.exe'],
  ])('%s rejects "%s"', (type, ext) => {
    expect(() => MediaExtension.create(type, ext)).toThrow(
      InvalidMediaExtensionException,
    );
  });

  it('exception carries code, type and the invalid file', () => {
    try {
      MediaExtension.create(EMediaType.VIDEO, 'avi');
      fail('expected throw');
    } catch (e) {
      const error = e as DomainException;
      expect(error.code).toBe('MEDIA_INVALID_EXTENSION');
      expect(error.type).toBe(EDomainErrorType.VALIDATION);
      expect(error.details).toEqual({
        files: [
          {
            index: 0,
            type: EMediaType.VIDEO,
            extension: 'avi',
            allowed: ['mp4', 'mov'],
          },
        ],
      });
    }
  });

  describe('createMany', () => {
    it('returns extensions in input order', () => {
      const result = MediaExtension.createMany([
        { type: EMediaType.VIDEO, extension: 'MOV' },
        { type: EMediaType.IMAGE, extension: '.webp' },
        { type: EMediaType.FILE, extension: 'pdf' },
      ]);
      expect(result.map((e) => [e.value, e.contentType])).toEqual([
        ['mov', 'video/quicktime'],
        ['webp', 'image/webp'],
        ['pdf', 'application/pdf'],
      ]);
    });

    it('lists every invalid item with its index in one exception', () => {
      try {
        MediaExtension.createMany([
          { type: EMediaType.IMAGE, extension: 'png' },
          { type: EMediaType.VIDEO, extension: 'png' },
          { type: EMediaType.FILE, extension: 'pdf' },
          { type: EMediaType.IMAGE, extension: 'gif' },
        ]);
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidMediaExtensionException);
        expect((e as DomainException).details).toEqual({
          files: [
            {
              index: 1,
              type: EMediaType.VIDEO,
              extension: 'png',
              allowed: ['mp4', 'mov'],
            },
            {
              index: 3,
              type: EMediaType.IMAGE,
              extension: 'gif',
              allowed: ['jpg', 'jpeg', 'png', 'webp'],
            },
          ],
        });
      }
    });

    it('returns empty for empty input', () => {
      expect(MediaExtension.createMany([])).toEqual([]);
    });
  });
});
