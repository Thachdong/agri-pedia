import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../../application/ports';
import { DiagnosisReportBuilder } from '../../application/use-cases';
import {
  IDiagnosisQueryPort,
  TDiagnosisOwnership,
  TDiagnosisReport,
} from '../../contracts';

@Injectable()
export class DiagnosisQueryService implements IDiagnosisQueryPort {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    private readonly reports: DiagnosisReportBuilder,
  ) {}

  async findOwnership(
    diagnosisId: string,
  ): Promise<TDiagnosisOwnership | null> {
    const diagnosis = await this.diagnoses.findById(diagnosisId);
    return diagnosis
      ? {
          diagnosisId: diagnosis.id,
          userId: diagnosis.userId,
          status: diagnosis.status,
        }
      : null;
  }

  async findReport(diagnosisId: string): Promise<TDiagnosisReport | null> {
    const diagnosis = await this.diagnoses.findById(diagnosisId);
    return diagnosis ? this.reports.build(diagnosis) : null;
  }
}
