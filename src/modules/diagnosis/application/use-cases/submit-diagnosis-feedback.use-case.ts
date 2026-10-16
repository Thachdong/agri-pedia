import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { DiagnosisNotFoundException, EDiagnosisFeedback } from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';

export type TSubmitDiagnosisFeedbackInput = {
  userId: string;
  diagnosisId: string;
  feedback: EDiagnosisFeedback;
  comment: string | null;
};

/** Owner's feedback on a completed diagnosis; sending again overwrites it. */
@Injectable()
export class SubmitDiagnosisFeedbackUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TSubmitDiagnosisFeedbackInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const diagnosis = await this.diagnoses.findByIdForUser(
        input.diagnosisId,
        input.userId,
      );
      if (!diagnosis) throw new DiagnosisNotFoundException(input.diagnosisId);
      diagnosis.giveFeedback(input.feedback, input.comment);
      await this.diagnoses.save(diagnosis);
    });
  }
}
