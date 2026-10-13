import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
} from '@modules/knowledge/contracts';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import {
  DiagnosisNotFoundException,
  EDiagnosisFeedback,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
  TBox,
  TConfidence,
} from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import { namingOf, TDiseaseNaming } from './diagnosis-disease-names';

export type TGetDiagnosisInput = { userId: string; diagnosisId: string };

export const DIAGNOSIS_DISCLAIMER =
  'Kết quả mang tính tham khảo, không thay thế chẩn đoán của chuyên gia.';

const IMAGE_MESSAGES: Record<EDiagnosisImageStatus, string | null> = {
  [EDiagnosisImageStatus.DISEASED]: null,
  [EDiagnosisImageStatus.NOT_TARGET_CROP]: 'Ảnh không phải cây lúa',
  [EDiagnosisImageStatus.LOW_QUALITY]: 'Ảnh mờ / quá xa, vui lòng chụp lại',
  [EDiagnosisImageStatus.HEALTHY]: 'Không phát hiện dấu hiệu bệnh',
  [EDiagnosisImageStatus.UNCERTAIN]:
    'Chưa xác định được bệnh, vui lòng thử ảnh khác',
};

export type TDiagnosedDisease = {
  diseaseCode: string;
  variantCode: string | null;
  diseaseName: string;
  variantName: string | null;
  confidence: TConfidence;
};

export type TGetDiagnosisOutput = {
  id: string;
  status: EDiagnosisStatus;
  cropType: string;
  note: string | null;
  summary: {
    hasDisease: boolean;
    conflict: boolean;
    diseases: Array<{
      diseaseCode: string;
      diseaseName: string;
      category: TDiseaseNaming['category'];
      confidence: TConfidence;
      imageCount: number;
    }>;
  } | null;
  images: Array<{
    /** Order of the file as sent. */
    index: number;
    mediaId: string | null;
    /** Signed URL of the stored (EXIF-rotated) image; null when not stored. */
    url: string | null;
    plantPart: EPlantPart;
    detectedPart: EPlantPart | null;
    status: EDiagnosisImageStatus | null;
    message: string | null;
    diseases: Array<
      TDiagnosedDisease & { category: TDiseaseNaming['category'] }
    >;
    regions: Array<{
      box: TBox;
      symptom: string;
      features: string[];
      /** null = UNCERTAIN region. */
      diagnosis: TDiagnosedDisease | null;
    }>;
  }>;
  userFeedback: EDiagnosisFeedback | null;
  disclaimer: string;
  createdAt: Date;
  completedAt: Date | null;
};

/** The caller's own diagnosis with image URLs and disease names; another user's reads as missing. */
@Injectable()
export class GetDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
  ) {}

  async execute(input: TGetDiagnosisInput): Promise<TGetDiagnosisOutput> {
    const diagnosis = await this.diagnoses.findByIdForUser(
      input.diagnosisId,
      input.userId,
    );
    if (!diagnosis) throw new DiagnosisNotFoundException(input.diagnosisId);

    const mediaIds = diagnosis.images.flatMap((i) => i.mediaId ?? []);
    const codes = new Set<string>();
    for (const image of diagnosis.images) {
      for (const d of image.diseases) {
        codes.add(d.diseaseCode);
        if (d.variantCode) codes.add(d.variantCode);
      }
      for (const r of image.regions) {
        if (!r.verdict) continue;
        codes.add(r.verdict.diseaseCode);
        if (r.verdict.variantCode) codes.add(r.verdict.variantCode);
      }
    }
    for (const d of diagnosis.summary?.diseases ?? []) codes.add(d.diseaseCode);

    const [urls, names] = await Promise.all([
      mediaIds.length > 0
        ? this.mediaQuery.findUrls('DIAGNOSIS', diagnosis.id, mediaIds)
        : Promise.resolve([]),
      codes.size > 0
        ? this.knowledgeQuery.getDiseaseNames([...codes])
        : Promise.resolve([]),
    ]);
    const urlByMedia = new Map(urls.map((u) => [u.mediaId, u.url]));
    const naming = namingOf(names);

    const summary = diagnosis.summary;
    return {
      id: diagnosis.id,
      status: diagnosis.status,
      cropType: diagnosis.cropType,
      note: diagnosis.note,
      summary: summary && {
        hasDisease: summary.hasDisease,
        conflict: summary.conflict,
        diseases: summary.diseases.map((d) => ({
          diseaseCode: d.diseaseCode,
          diseaseName: naming(d.diseaseCode).diseaseName,
          category: naming(d.diseaseCode).category,
          confidence: d.confidence,
          imageCount: d.imageCount,
        })),
      },
      images: diagnosis.images.map((image) => ({
        index: image.sortOrder,
        mediaId: image.mediaId,
        url: (image.mediaId && urlByMedia.get(image.mediaId)) ?? null,
        plantPart: image.plantPart,
        detectedPart: image.detectedPart,
        status: image.status,
        message: image.status ? IMAGE_MESSAGES[image.status] : null,
        diseases: image.diseases.map((d) => {
          const name = naming(d.diseaseCode, d.variantCode);
          return {
            diseaseCode: d.diseaseCode,
            variantCode: d.variantCode,
            diseaseName: name.diseaseName,
            variantName: name.variantName,
            category: name.category,
            confidence: d.confidence,
          };
        }),
        regions: image.regions.map((region) => {
          const verdict = region.verdict;
          const name =
            verdict && naming(verdict.diseaseCode, verdict.variantCode);
          return {
            box: region.box,
            symptom: region.descriptionVi,
            features: verdict?.features ?? [],
            diagnosis:
              verdict && region.confidence
                ? {
                    diseaseCode: verdict.diseaseCode,
                    variantCode: verdict.variantCode,
                    diseaseName: name.diseaseName,
                    variantName: name.variantName,
                    confidence: region.confidence,
                  }
                : null,
          };
        }),
      })),
      userFeedback: diagnosis.userFeedback,
      disclaimer: DIAGNOSIS_DISCLAIMER,
      createdAt: diagnosis.createdAt,
      completedAt: diagnosis.completedAt,
    };
  }
}
