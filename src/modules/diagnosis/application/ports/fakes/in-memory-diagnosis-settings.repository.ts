import {
  DEFAULT_DIAGNOSIS_AI_MODELS,
  DEFAULT_DIAGNOSIS_SETTINGS,
  DiagnosisSettings,
  TDiagnosisAiModels,
  TDiagnosisSettingsProps,
} from '../../../domain';
import { IDiagnosisSettingsRepository } from '../diagnosis-settings.repository';

export class InMemoryDiagnosisSettingsRepository implements IDiagnosisSettingsRepository {
  /** Saved settings; null = never saved. */
  saved: TDiagnosisSettingsProps | null = null;
  savedAiModels: TDiagnosisAiModels = DEFAULT_DIAGNOSIS_AI_MODELS;

  async get(): Promise<DiagnosisSettings> {
    return this.saved
      ? DiagnosisSettings.restore(this.saved, this.savedAiModels)
      : DiagnosisSettings.restore(
          DEFAULT_DIAGNOSIS_SETTINGS,
          this.savedAiModels,
        );
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
    this.savedAiModels = {
      describeModel: settings.describeModel,
      verifyModel: settings.verifyModel,
    };
  }
}
