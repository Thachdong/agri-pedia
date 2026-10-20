import { DiagnosisSettings } from '../../domain';

export interface IDiagnosisSettingsRepository {
  /** Saved settings; defaults when none were saved. */
  get(): Promise<DiagnosisSettings>;
  save(settings: DiagnosisSettings): Promise<void>;
}

export const DIAGNOSIS_SETTINGS_REPOSITORY = Symbol(
  'DIAGNOSIS_SETTINGS_REPOSITORY',
);
