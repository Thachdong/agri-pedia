import { IConfigService } from '@shared/config';
import { DiagnosisSettings, TDiagnosisAiModels } from '../domain';
import { TVisionModels } from './ports/vision-diagnosis.provider';

/** Models the env (`diagnosis` config) sets; used when an admin picked none. */
export function envVisionModels(config: IConfigService): TVisionModels {
  const { describeModel, verifyModel } = config.get('diagnosis');
  return { describeModel, verifyModel };
}

/** Admin-picked models, each falling back to the env model. */
export function resolveVisionModels(
  settings: DiagnosisSettings,
  config: IConfigService,
): TVisionModels {
  const env = envVisionModels(config);
  return {
    describeModel: settings.describeModel ?? env.describeModel,
    verifyModel: settings.verifyModel ?? env.verifyModel,
  };
}

/** Admin view: picked models (null = none picked) and the env models used in their place. */
export type TDiagnosisAiModelsOutput = TDiagnosisAiModels & {
  defaults: TVisionModels;
};

export const toAiModelsOutput = (
  settings: DiagnosisSettings,
  config: IConfigService,
): TDiagnosisAiModelsOutput => ({
  describeModel: settings.describeModel,
  verifyModel: settings.verifyModel,
  defaults: envVisionModels(config),
});
