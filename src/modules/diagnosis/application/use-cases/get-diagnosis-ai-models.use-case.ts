import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { assertDiagnosisAdmin } from '../diagnosis-admin';
import {
  TDiagnosisAiModelsOutput,
  toAiModelsOutput,
} from '../diagnosis-ai-models';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';

export type TGetDiagnosisAiModelsInput = { userId: string };

/** AI models of the diagnosis steps, for the admin settings page. */
@Injectable()
export class GetDiagnosisAiModelsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {}

  async execute(
    input: TGetDiagnosisAiModelsInput,
  ): Promise<TDiagnosisAiModelsOutput> {
    await assertDiagnosisAdmin(this.userQuery, input.userId);
    return toAiModelsOutput(await this.settings.get(), this.config);
  }
}
