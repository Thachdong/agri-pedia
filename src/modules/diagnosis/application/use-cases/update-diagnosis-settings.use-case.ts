import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
} from '@modules/knowledge/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  DiagnosisCropNotSupportedException,
  TDiagnosisSettingsProps,
} from '../../domain';
import {
  assertDiagnosisAdmin,
  TDiagnosisSettingsOutput,
  toSettingsOutput,
} from '../diagnosis-admin';
import {
  DIAGNOSIS_SETTINGS_REPOSITORY,
  IDiagnosisSettingsRepository,
} from '../ports/diagnosis-settings.repository';

export type TUpdateDiagnosisSettingsInput = TDiagnosisSettingsProps & {
  userId: string;
};

/** Replaces every diagnosis setting; the default crop must be enabled for diagnosis. */
@Injectable()
export class UpdateDiagnosisSettingsUseCase {
  constructor(
    @Inject(DIAGNOSIS_SETTINGS_REPOSITORY)
    private readonly settings: IDiagnosisSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TUpdateDiagnosisSettingsInput,
  ): Promise<TDiagnosisSettingsOutput> {
    const { userId, ...props } = input;
    await assertDiagnosisAdmin(this.userQuery, userId);
    if (props.defaultCropType !== null) {
      const crop = await this.knowledgeQuery.findDiagnosisCrop(
        props.defaultCropType,
      );
      if (!crop?.enabled) {
        throw new DiagnosisCropNotSupportedException(props.defaultCropType);
      }
    }
    const saved = await this.unitOfWork.runInTransaction(async () => {
      const settings = await this.settings.get();
      settings.update(props);
      await this.settings.save(settings);
      return settings;
    });
    return toSettingsOutput(saved);
  }
}
