import { DiagnosisInvalidSettingsException } from '../exceptions/diagnosis-invalid-settings.exception';
import {
  DEFAULT_DIAGNOSIS_SETTINGS,
  DiagnosisSettings,
  TDiagnosisSettingsProps,
} from './diagnosis-settings.entity';

const valid: TDiagnosisSettingsProps = {
  dailyFreeLimit: 10,
  defaultCropType: 'RICE',
  maxImages: 3,
  maxImageBytes: 2 * 1024 * 1024,
  maxImageWidth: 2048,
  maxImageHeight: 1536,
};

describe('DiagnosisSettings', () => {
  it('defaults to 3 diagnoses a day, no default crop, 5 images of 5MB / 4096px', () => {
    const settings = DiagnosisSettings.defaults();

    expect(settings.dailyFreeLimit).toBe(3);
    expect(settings.defaultCropType).toBeNull();
    expect(settings.maxImages).toBe(5);
    expect(settings.maxImageBytes).toBe(5 * 1024 * 1024);
    expect(settings.maxImageWidth).toBe(4096);
    expect(settings.maxImageHeight).toBe(4096);
  });

  it('update replaces every setting', () => {
    const settings = DiagnosisSettings.defaults();

    settings.update(valid);

    expect({
      dailyFreeLimit: settings.dailyFreeLimit,
      defaultCropType: settings.defaultCropType,
      maxImages: settings.maxImages,
      maxImageBytes: settings.maxImageBytes,
      maxImageWidth: settings.maxImageWidth,
      maxImageHeight: settings.maxImageHeight,
    }).toEqual(valid);
  });

  it('accepts no default crop', () => {
    const settings = DiagnosisSettings.defaults();

    settings.update({ ...valid, defaultCropType: null });

    expect(settings.defaultCropType).toBeNull();
  });

  it.each([
    ['dailyFreeLimit', 0],
    ['dailyFreeLimit', 1001],
    ['dailyFreeLimit', 2.5],
    ['maxImages', 0],
    ['maxImages', 11],
    ['maxImageBytes', 100 * 1024 - 1],
    ['maxImageBytes', 20 * 1024 * 1024 + 1],
    ['maxImageWidth', 255],
    ['maxImageWidth', 8193],
    ['maxImageHeight', 255],
    ['maxImageHeight', 8193],
  ])('rejects %s = %s and keeps the previous settings', (field, value) => {
    const settings = DiagnosisSettings.defaults();

    expect(() => settings.update({ ...valid, [field]: value })).toThrow(
      DiagnosisInvalidSettingsException,
    );
    expect(settings.maxImages).toBe(DEFAULT_DIAGNOSIS_SETTINGS.maxImages);
  });

  it('rejects a default crop that is not a crop code', () => {
    expect(() =>
      DiagnosisSettings.defaults().update({
        ...valid,
        defaultCropType: 'rice',
      }),
    ).toThrow(DiagnosisInvalidSettingsException);
  });
});
