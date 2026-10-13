import { InMemoryUnitOfWork } from '@shared/database';
import {
  DiagnosisNotCompletedException,
  DiagnosisNotFoundException,
  EDiagnosisFeedback,
  EDiagnosisStatus,
} from '../../domain';
import { buildDiagnosis, InMemoryDiagnosisRepository } from '../ports/fakes';
import { SubmitDiagnosisFeedbackUseCase } from './submit-diagnosis-feedback.use-case';

describe('SubmitDiagnosisFeedbackUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let useCase: SubmitDiagnosisFeedbackUseCase;

  beforeEach(() => {
    diagnoses = new InMemoryDiagnosisRepository();
    useCase = new SubmitDiagnosisFeedbackUseCase(
      diagnoses,
      new InMemoryUnitOfWork(),
    );
  });

  it("stores the feedback on the owner's completed diagnosis", async () => {
    const diagnosis = buildDiagnosis({ status: EDiagnosisStatus.COMPLETED });
    await diagnoses.save(diagnosis);

    await useCase.execute({
      userId: 'u1',
      diagnosisId: diagnosis.id,
      feedback: EDiagnosisFeedback.WRONG,
      comment: 'là bệnh khác',
    });

    expect(diagnosis.userFeedback).toBe(EDiagnosisFeedback.WRONG);
    expect(diagnosis.feedbackComment).toBe('là bệnh khác');
  });

  it("rejects another user's diagnosis and an unfinished one", async () => {
    const other = buildDiagnosis({
      userId: 'u2',
      status: EDiagnosisStatus.COMPLETED,
    });
    const processing = buildDiagnosis();
    await diagnoses.save(other);
    await diagnoses.save(processing);
    const input = {
      userId: 'u1',
      feedback: EDiagnosisFeedback.CORRECT,
      comment: null,
    };

    await expect(
      useCase.execute({ ...input, diagnosisId: other.id }),
    ).rejects.toBeInstanceOf(DiagnosisNotFoundException);
    await expect(
      useCase.execute({ ...input, diagnosisId: processing.id }),
    ).rejects.toBeInstanceOf(DiagnosisNotCompletedException);
  });
});
