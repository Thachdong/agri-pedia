import { IKnowledgeQueryPort } from '@modules/knowledge/contracts';
import { IMediaQueryPort } from '@modules/media/contracts';
import {
  DiagnosisNotFoundException,
  EConfidenceLevel,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
} from '../../domain';
import { buildDiagnosis, InMemoryDiagnosisRepository } from '../ports/fakes';
import { GetDiagnosisUseCase } from './get-diagnosis.use-case';

const high = { level: EConfidenceLevel.HIGH, score: 0.85 };

const mediaQuery = {
  findUrls: async (_type: string, ownerId: string, ids: string[]) =>
    ids.map((mediaId) => ({
      mediaId,
      url: `https://cdn/${ownerId}/${mediaId}`,
    })),
} as unknown as IMediaQueryPort;

const knowledgeQuery = {
  getDiseaseNames: async (codes: string[]) =>
    codes.flatMap((code) =>
      code === 'RICE_BLAST'
        ? [
            {
              code,
              diseaseCode: code,
              diseaseName: 'Bệnh đạo ôn',
              variantName: null,
              category: 'DISEASE',
            },
          ]
        : code === 'RICE_BLAST__V1'
          ? [
              {
                code,
                diseaseCode: 'RICE_BLAST',
                diseaseName: 'Bệnh đạo ôn',
                variantName: 'Đạo ôn lá',
                category: 'DISEASE',
              },
            ]
          : [],
    ),
} as unknown as IKnowledgeQueryPort;

describe('GetDiagnosisUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let useCase: GetDiagnosisUseCase;

  beforeEach(() => {
    diagnoses = new InMemoryDiagnosisRepository();
    useCase = new GetDiagnosisUseCase(diagnoses, mediaQuery, knowledgeQuery);
  });

  it('returns a completed diagnosis with URLs, names, regions and messages', async () => {
    const diagnosis = buildDiagnosis({
      status: EDiagnosisStatus.COMPLETED,
      completedAt: new Date('2026-10-13T00:01:00Z'),
      summary: {
        hasDisease: true,
        conflict: false,
        diseases: [
          { diseaseCode: 'RICE_BLAST', confidence: high, imageCount: 1 },
        ],
      },
      images: [
        {
          mediaId: 'm0',
          detectedPart: EPlantPart.LEAF,
          status: EDiagnosisImageStatus.DISEASED,
          diseases: [
            {
              diseaseCode: 'RICE_BLAST',
              variantCode: 'RICE_BLAST__V1',
              confidence: high,
            },
          ],
          regions: [
            {
              box: { x: 0.1, y: 0.2, w: 0.1, h: 0.1 },
              observations: {},
              descriptionEn: 'spindle',
              descriptionVi: 'vết hình thoi',
              candidates: [],
              verdict: {
                diseaseCode: 'RICE_BLAST',
                variantCode: 'RICE_BLAST__V1',
                isLesion: true,
                selfConfidence: EConfidenceLevel.HIGH,
                features: ['tâm xám trắng'],
              },
              confidence: high,
            },
            {
              box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
              observations: {},
              descriptionEn: 'dots',
              descriptionVi: 'chấm nhỏ',
              candidates: [],
              verdict: null,
              confidence: null,
            },
          ],
        },
        { status: EDiagnosisImageStatus.LOW_QUALITY },
      ],
    });
    await diagnoses.save(diagnosis);

    const result = await useCase.execute({
      userId: 'u1',
      diagnosisId: diagnosis.id,
    });

    expect(result.summary).toEqual({
      hasDisease: true,
      conflict: false,
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          diseaseName: 'Bệnh đạo ôn',
          category: 'DISEASE',
          confidence: high,
          imageCount: 1,
        },
      ],
    });
    expect(result.images[0]).toEqual({
      index: 0,
      mediaId: 'm0',
      url: `https://cdn/${diagnosis.id}/m0`,
      plantPart: EPlantPart.LEAF,
      detectedPart: EPlantPart.LEAF,
      status: EDiagnosisImageStatus.DISEASED,
      message: null,
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          variantCode: 'RICE_BLAST__V1',
          diseaseName: 'Bệnh đạo ôn',
          variantName: 'Đạo ôn lá',
          category: 'DISEASE',
          confidence: high,
        },
      ],
      regions: [
        {
          box: { x: 0.1, y: 0.2, w: 0.1, h: 0.1 },
          symptom: 'vết hình thoi',
          features: ['tâm xám trắng'],
          diagnosis: {
            diseaseCode: 'RICE_BLAST',
            variantCode: 'RICE_BLAST__V1',
            diseaseName: 'Bệnh đạo ôn',
            variantName: 'Đạo ôn lá',
            confidence: high,
          },
        },
        {
          box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
          symptom: 'chấm nhỏ',
          features: [],
          diagnosis: null,
        },
      ],
    });
    expect(result.images[1]).toMatchObject({
      url: null,
      status: EDiagnosisImageStatus.LOW_QUALITY,
      message: 'Ảnh mờ / quá xa, vui lòng chụp lại',
    });
    expect(result.disclaimer).toContain('tham khảo');
  });

  it('returns a processing diagnosis without summary or image results', async () => {
    const diagnosis = buildDiagnosis();
    await diagnoses.save(diagnosis);

    const result = await useCase.execute({
      userId: 'u1',
      diagnosisId: diagnosis.id,
    });

    expect(result).toMatchObject({
      status: EDiagnosisStatus.PROCESSING,
      summary: null,
      completedAt: null,
    });
    expect(result.images[0]).toMatchObject({
      status: null,
      message: null,
      regions: [],
      url: null,
    });
  });

  it("hides another user's diagnosis as not found", async () => {
    const diagnosis = buildDiagnosis({ userId: 'u2' });
    await diagnoses.save(diagnosis);

    await expect(
      useCase.execute({ userId: 'u1', diagnosisId: diagnosis.id }),
    ).rejects.toBeInstanceOf(DiagnosisNotFoundException);
  });
});
