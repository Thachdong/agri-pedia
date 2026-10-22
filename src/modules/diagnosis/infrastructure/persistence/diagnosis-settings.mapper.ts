import { DiagnosisSettings } from '../../domain';
import {
  DIAGNOSIS_SETTINGS_ROW_ID,
  DiagnosisSettingsOrmEntity,
} from './diagnosis-settings.orm-entity';

export class DiagnosisSettingsMapper {
  static toDomain(row: DiagnosisSettingsOrmEntity): DiagnosisSettings {
    return DiagnosisSettings.restore(
      {
        dailyFreeLimit: row.dailyFreeLimit,
        defaultCropType: row.defaultCropType,
        maxImages: row.maxImages,
        maxImageBytes: row.maxImageBytes,
        maxImageWidth: row.maxImageWidth,
        maxImageHeight: row.maxImageHeight,
      },
      { describeModel: row.describeModel, verifyModel: row.verifyModel },
    );
  }

  static toOrm(settings: DiagnosisSettings): DiagnosisSettingsOrmEntity {
    return Object.assign(new DiagnosisSettingsOrmEntity(), {
      id: DIAGNOSIS_SETTINGS_ROW_ID,
      dailyFreeLimit: settings.dailyFreeLimit,
      defaultCropType: settings.defaultCropType,
      maxImages: settings.maxImages,
      maxImageBytes: settings.maxImageBytes,
      maxImageWidth: settings.maxImageWidth,
      maxImageHeight: settings.maxImageHeight,
      describeModel: settings.describeModel,
      verifyModel: settings.verifyModel,
    });
  }
}
