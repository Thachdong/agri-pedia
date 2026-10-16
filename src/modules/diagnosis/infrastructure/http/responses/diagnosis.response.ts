import {
  EConfidenceLevel,
  EDiagnosisFeedback,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
} from '../../../domain';

export class CreateDiagnosisResponse {
  id: string;
  /** Always PROCESSING; wait for realtime `diagnosis.completed` or poll GET /diagnoses/:id. */
  status: EDiagnosisStatus;
}

export class DiagnosisConfidenceResponse {
  level: EConfidenceLevel;
  /** Not calibrated; only for ranking. */
  score: number;
}

export class DiagnosisSummaryDiseaseResponse {
  diseaseCode: string;
  diseaseName: string;
  category: 'DISEASE' | 'PEST' | 'DISORDER' | null;
  confidence: DiagnosisConfidenceResponse;
  imageCount: number;
}

export class DiagnosisSummaryResponse {
  hasDisease: boolean;
  /** Two different diseases are HIGH on different images. */
  conflict: boolean;
  diseases: DiagnosisSummaryDiseaseResponse[];
}

export class DiagnosedDiseaseResponse {
  diseaseCode: string;
  variantCode: string | null;
  diseaseName: string;
  variantName: string | null;
  confidence: DiagnosisConfidenceResponse;
}

export class DiagnosisImageDiseaseResponse extends DiagnosedDiseaseResponse {
  category: 'DISEASE' | 'PEST' | 'DISORDER' | null;
}

export class DiagnosisBoxResponse {
  /** 0..1 on the stored (EXIF-rotated) image; x/y = top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DiagnosisRegionResponse {
  box: DiagnosisBoxResponse;
  /** Symptom seen in the region (Vietnamese). */
  symptom: string;
  /** Features supporting the diagnosis (Vietnamese). */
  features: string[];
  /** null = UNCERTAIN region. */
  diagnosis: DiagnosedDiseaseResponse | null;
}

export class DiagnosisImageResponse {
  /** Order of the file as sent. */
  index: number;
  mediaId: string | null;
  /** Signed URL; null when the image is not stored (yet). */
  url: string | null;
  plantPart: EPlantPart;
  detectedPart: EPlantPart | null;
  /** null while PROCESSING. */
  status: EDiagnosisImageStatus | null;
  message: string | null;
  diseases: DiagnosisImageDiseaseResponse[];
  regions: DiagnosisRegionResponse[];
}

export class GetDiagnosisResponse {
  id: string;
  status: EDiagnosisStatus;
  cropType: string;
  note: string | null;
  /** null unless COMPLETED. */
  summary: DiagnosisSummaryResponse | null;
  images: DiagnosisImageResponse[];
  userFeedback: EDiagnosisFeedback | null;
  disclaimer: string;
  createdAt: Date;
  completedAt: Date | null;
}

export class DiagnosisListDiseaseResponse {
  diseaseCode: string;
  diseaseName: string;
  confidenceLevel: EConfidenceLevel;
}

export class DiagnosisListItemResponse {
  id: string;
  status: EDiagnosisStatus;
  cropType: string;
  /** Signed URL of the first image; null when none stored. */
  thumbnail: string | null;
  /** Empty while PROCESSING or when FAILED. */
  diseases: DiagnosisListDiseaseResponse[];
  createdAt: Date;
}

export class ListMyDiagnosesResponse {
  diagnoses: DiagnosisListItemResponse[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}
