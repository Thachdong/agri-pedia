import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { TDiagnosisAiModels } from '../../domain';
import { assertDiagnosisAdmin } from '../diagnosis-admin';
import {
  TDiagnosisAiModelsOutput,
  toAiModelsOutput,
} from '../diagnosis-ai-models';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';

export type TUpdateDiagnosisAiModelsInput = TDiagnosisAiModels & {
  userId: string;
};

/** Replaces both AI models (null = env model); applies to diagnoses created afterwards. */
@Injectable()
export class UpdateDiagnosisAiModelsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TUpdateDiagnosisAiModelsInput,
  ): Promise<TDiagnosisAiModelsOutput> {
    const { userId, ...models } = input;
    await assertDiagnosisAdmin(this.userQuery, userId);
    const saved = await this.unitOfWork.runInTransaction(async () => {
      const settings = await this.settings.get();
      settings.updateAiModels(models);
      await this.settings.save(settings);
      return settings;
    });
    return toAiModelsOutput(saved, this.config);
  }
}
