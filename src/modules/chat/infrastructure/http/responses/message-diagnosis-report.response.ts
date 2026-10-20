/** Same shape as GET /diagnoses/{diagnosisId} (diagnosis module). */
export class ChatDiagnosisConfidenceResponse {
  /** HIGH | MEDIUM | LOW. */
  level: string;
  /** Not calibrated; only for ranking. */
  score: number;
}

export class ChatDiagnosisSummaryDiseaseResponse {
  diseaseCode: string;
  diseaseName: string;
  /** DISEASE | PEST | DISORDER; null when unknown. */
  category: string | null;
  confidence: ChatDiagnosisConfidenceResponse;
  imageCount: number;
}

export class ChatDiagnosisSummaryResponse {
  hasDisease: boolean;
  /** Two different diseases are HIGH on different images. */
  conflict: boolean;
  diseases: ChatDiagnosisSummaryDiseaseResponse[];
}

export class ChatDiagnosedDiseaseResponse {
  diseaseCode: string;
  variantCode: string | null;
  diseaseName: string;
  variantName: string | null;
  confidence: ChatDiagnosisConfidenceResponse;
}

export class ChatDiagnosisImageDiseaseResponse extends ChatDiagnosedDiseaseResponse {
  /** DISEASE | PEST | DISORDER; null when unknown. */
  category: string | null;
}

export class ChatDiagnosisBoxResponse {
  /** 0..1 on the stored (EXIF-rotated) image; x/y = top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ChatDiagnosisRegionResponse {
  box: ChatDiagnosisBoxResponse;
  /** Symptom seen in the region (Vietnamese). */
  symptom: string;
  /** Features supporting the diagnosis (Vietnamese). */
  features: string[];
  /** null = UNCERTAIN region. */
  diagnosis: ChatDiagnosedDiseaseResponse | null;
}

export class ChatDiagnosisImageResponse {
  /** Order of the file as sent. */
  index: number;
  mediaId: string | null;
  /** Signed URL; null when the image is not stored. */
  url: string | null;
  /** Plant part code of the crop (GET /knowledge/crops). */
  plantPart: string;
  detectedPart: string | null;
  /** DISEASED | HEALTHY | UNCERTAIN | NOT_TARGET_CROP | LOW_QUALITY; null while PROCESSING. */
  status: string | null;
  message: string | null;
  diseases: ChatDiagnosisImageDiseaseResponse[];
  regions: ChatDiagnosisRegionResponse[];
}

export class MessageDiagnosisReportResponse {
  id: string;
  /** PROCESSING | COMPLETED | FAILED. */
  status: string;
  cropType: string;
  note: string | null;
  /** null unless COMPLETED. */
  summary: ChatDiagnosisSummaryResponse | null;
  images: ChatDiagnosisImageResponse[];
  /** CORRECT | WRONG | UNSURE; the farmer's own feedback. */
  userFeedback: string | null;
  disclaimer: string;
  createdAt: Date;
  completedAt: Date | null;
}
