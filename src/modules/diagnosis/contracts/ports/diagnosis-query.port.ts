export type TDiagnosisStatusValue = 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** Who owns a diagnosis and how far it got. */
export type TDiagnosisOwnership = {
  diagnosisId: string;
  userId: string;
  status: TDiagnosisStatusValue;
};

export type TDiagnosisReportConfidence = {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Not calibrated; only for ranking. */
  score: number;
};

export type TDiagnosisReportCategory = 'DISEASE' | 'PEST' | 'DISORDER' | null;

export type TDiagnosisReportDisease = {
  diseaseCode: string;
  variantCode: string | null;
  diseaseName: string;
  variantName: string | null;
  confidence: TDiagnosisReportConfidence;
};

/** A diagnosis as its owner reads it (GET /diagnoses/:id), image URLs signed. */
export type TDiagnosisReport = {
  id: string;
  status: TDiagnosisStatusValue;
  cropType: string;
  note: string | null;
  /** null unless COMPLETED. */
  summary: {
    hasDisease: boolean;
    conflict: boolean;
    diseases: Array<{
      diseaseCode: string;
      diseaseName: string;
      category: TDiagnosisReportCategory;
      confidence: TDiagnosisReportConfidence;
      imageCount: number;
    }>;
  } | null;
  images: Array<{
    index: number;
    mediaId: string | null;
    url: string | null;
    plantPart: string;
    detectedPart: string | null;
    status:
      | 'DISEASED'
      | 'HEALTHY'
      | 'UNCERTAIN'
      | 'NOT_TARGET_CROP'
      | 'LOW_QUALITY'
      | null;
    message: string | null;
    diseases: Array<
      TDiagnosisReportDisease & { category: TDiagnosisReportCategory }
    >;
    regions: Array<{
      box: { x: number; y: number; w: number; h: number };
      symptom: string;
      features: string[];
      /** null = UNCERTAIN region. */
      diagnosis: TDiagnosisReportDisease | null;
    }>;
  }>;
  userFeedback: 'CORRECT' | 'WRONG' | 'UNSURE' | null;
  disclaimer: string;
  createdAt: Date;
  completedAt: Date | null;
};

/** Read-only access to diagnoses for other modules (e.g. chat shares a report). */
export interface IDiagnosisQueryPort {
  findOwnership(diagnosisId: string): Promise<TDiagnosisOwnership | null>;
  /** Any user's diagnosis; the caller decides who may read it. */
  findReport(diagnosisId: string): Promise<TDiagnosisReport | null>;
}
