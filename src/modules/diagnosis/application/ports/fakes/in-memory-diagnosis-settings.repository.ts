import { DiagnosisSettings, TDiagnosisSettingsProps } from '../../../domain';
import { IDiagnosisSettingsRepository } from '../diagnosis-settings.repository';

export class InMemoryDiagnosisSettingsRepository implements IDiagnosisSettingsRepository {
  /** Saved settings; null = never saved. */
  saved: TDiagnosisSettingsProps | null = null;

  async get(): Promise<DiagnosisSettings> {
    return this.saved
      ? DiagnosisSettings.restore(this.saved)
      : DiagnosisSettings.defaults();
  }

  async save(settings: DiagnosisSettings): Promise<void> {
    this.saved = {
      dailyFreeLimit: settings.dailyFreeLimit,
      defaultCropType: settings.defaultCropType,
      maxImages: settings.maxImages,
      maxImageBytes: settings.maxImageBytes,
      maxImageWidth: settings.maxImageWidth,
      maxImageHeight: settings.maxImageHeight,
    };
  }
}
