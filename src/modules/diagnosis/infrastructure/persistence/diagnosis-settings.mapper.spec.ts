import { DiagnosisSettings } from '../../domain';
import { DiagnosisSettingsMapper } from './diagnosis-settings.mapper';

describe('DiagnosisSettingsMapper', () => {
  it('round-trips every setting in row 1', () => {
    const settings = DiagnosisSettings.defaults();
    settings.update({
      dailyFreeLimit: 7,
      defaultCropType: 'RICE',
      maxImages: 3,
      maxImageBytes: 2097152,
      maxImageWidth: 3000,
      maxImageHeight: 2000,
    });

    const row = DiagnosisSettingsMapper.toOrm(settings);

    expect(row.id).toBe(1);
    expect(DiagnosisSettingsMapper.toDomain(row)).toEqual(settings);
  });
});
