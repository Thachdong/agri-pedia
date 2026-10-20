import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
} from '@modules/knowledge/contracts';
import { MIN_DIAGNOSIS_IMAGES } from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';
import { startOfLocalDay } from './create-diagnosis.use-case';

export type TGetDiagnosisFormSettingsInput = {
  /** Caller, from the access token; null for a guest. */
  userId: string | null;
};

export type TGetDiagnosisFormSettingsOutput = {
  /** Crop to preselect; null = none (unset, or no longer enabled for diagnosis). */
  defaultCropType: string | null;
  minImages: number;
  maxImages: number;
  maxImageBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  /** Diagnoses the caller may still send today (daily limit, Vietnam day); null for a guest. */
  remainingToday: number | null;
};

/** What the diagnosis form needs to build and check a request, plus the caller's diagnoses left today. */
@Injectable()
export class GetDiagnosisFormSettingsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
  ) {}

  async execute(
    input: TGetDiagnosisFormSettingsInput,
  ): Promise<TGetDiagnosisFormSettingsOutput> {
    const settings = await this.settings.get();
    const crop = settings.defaultCropType
      ? await this.knowledgeQuery.findDiagnosisCrop(settings.defaultCropType)
      : null;
    const remainingToday =
      input.userId === null
        ? null
        : Math.max(
            0,
            settings.dailyFreeLimit -
              (await this.diagnoses.countByUserSince(
                input.userId,
                startOfLocalDay(new Date()),
              )),
          );
    return {
      defaultCropType: crop?.enabled ? crop.code : null,
      minImages: MIN_DIAGNOSIS_IMAGES,
      maxImages: settings.maxImages,
      maxImageBytes: settings.maxImageBytes,
      maxImageWidth: settings.maxImageWidth,
      maxImageHeight: settings.maxImageHeight,
      remainingToday,
    };
  }
}
