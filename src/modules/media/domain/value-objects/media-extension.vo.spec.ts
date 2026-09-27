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

  it('exception carries code, type and allowed list', () => {
    try {
      MediaExtension.create(EMediaType.VIDEO, 'avi');
      fail('expected throw');
    } catch (e) {
      const error = e as DomainException;
      expect(error.code).toBe('MEDIA_INVALID_EXTENSION');
      expect(error.type).toBe(EDomainErrorType.VALIDATION);
      expect(error.details).toEqual({
        type: EMediaType.VIDEO,
        extension: 'avi',
        allowed: ['mp4', 'mov'],
      });
    }
  });
});
