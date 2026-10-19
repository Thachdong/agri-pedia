import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  assertDiagnosisAdmin,
  TDiagnosisSettingsOutput,
  toSettingsOutput,
} from '../diagnosis-admin';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';

export type TGetDiagnosisSettingsInput = { userId: string };

/** Every diagnosis setting, for the admin settings page. */
@Injectable()
export class GetDiagnosisSettingsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
  ) {}

  async execute(
    input: TGetDiagnosisSettingsInput,
  ): Promise<TDiagnosisSettingsOutput> {
    await assertDiagnosisAdmin(this.userQuery, input.userId);
    return toSettingsOutput(await this.settings.get());
  }
}
