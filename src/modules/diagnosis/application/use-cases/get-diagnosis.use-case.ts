import { Inject, Injectable } from '@nestjs/common';
import { DiagnosisNotFoundException } from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import {
  DiagnosisReportBuilder,
  TDiagnosisReportOutput,
} from './diagnosis-report.builder';

export type TGetDiagnosisInput = { userId: string; diagnosisId: string };

export type TGetDiagnosisOutput = TDiagnosisReportOutput;

/** The caller's own diagnosis with image URLs and disease names; another user's reads as missing. */
@Injectable()
export class GetDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    private readonly reports: DiagnosisReportBuilder,
  ) {}

  async execute(input: TGetDiagnosisInput): Promise<TGetDiagnosisOutput> {
    const diagnosis = await this.diagnoses.findByIdForUser(
      input.diagnosisId,
      input.userId,
    );
    if (!diagnosis) throw new DiagnosisNotFoundException(input.diagnosisId);
    return this.reports.build(diagnosis);
  }
}
