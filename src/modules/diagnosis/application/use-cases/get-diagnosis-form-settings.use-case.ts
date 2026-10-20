import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
} from '@modules/knowledge/contracts';
import { MIN_DIAGNOSIS_IMAGES } from '../../domain';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';

export type TGetDiagnosisFormSettingsOutput = {
  /** Crop to preselect; null = none (unset, or no longer enabled for diagnosis). */
  defaultCropType: string | null;
  minImages: number;
  maxImages: number;
  maxImageBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
};

/** What the diagnosis form needs to build and check a request. */
@Injectable()
export class GetDiagnosisFormSettingsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
  ) {}

  async execute(): Promise<TGetDiagnosisFormSettingsOutput> {
    const settings = await this.settings.get();
    const crop = settings.defaultCropType
      ? await this.knowledgeQuery.findDiagnosisCrop(settings.defaultCropType)
      : null;
    return {
      defaultCropType: crop?.enabled ? crop.code : null,
      minImages: MIN_DIAGNOSIS_IMAGES,
      maxImages: settings.maxImages,
      maxImageBytes: settings.maxImageBytes,
      maxImageWidth: settings.maxImageWidth,
      maxImageHeight: settings.maxImageHeight,
    };
  }
}
