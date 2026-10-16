import { IKnowledgeQueryPort } from '@modules/knowledge/contracts';
import { IMediaQueryPort } from '@modules/media/contracts';
import {
  EConfidenceLevel,
  EDiagnosisStatus,
  InvalidDiagnosisCursorException,
} from '../../domain';
import { buildDiagnosis, InMemoryDiagnosisRepository } from '../ports/fakes';
import { ListMyDiagnosesUseCase } from './list-my-diagnoses.use-case';

const mediaQuery = {
  findThumbnails: async (_type: string, ownerIds: string[]) =>
    ownerIds
      .slice(0, 1)
      .map((ownerId) => ({ ownerId, url: `https://cdn/${ownerId}` })),
} as unknown as IMediaQueryPort;

const knowledgeQuery = {
  getDiseaseNames: async (codes: string[]) =>
    codes.map((code) => ({
      code,
      diseaseCode: code,
      diseaseName: `name ${code}`,
      variantName: null,
      category: 'DISEASE',
    })),
} as unknown as IKnowledgeQueryPort;

describe('ListMyDiagnosesUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let useCase: ListMyDiagnosesUseCase;

  beforeEach(async () => {
    diagnoses = new InMemoryDiagnosisRepository();
    useCase = new ListMyDiagnosesUseCase(diagnoses, mediaQuery, knowledgeQuery);
    await diagnoses.save(
      buildDiagnosis({
        id: '00000000-0000-4000-8000-000000000003',
        createdAt: new Date('2026-10-13T03:00:00Z'),
        status: EDiagnosisStatus.COMPLETED,
        summary: {
          hasDisease: true,
          conflict: false,
          diseases: [
            {
              diseaseCode: 'RICE_BLAST',
              confidence: { level: EConfidenceLevel.HIGH, score: 0.9 },
              imageCount: 1,
            },
          ],
        },
      }),
    );
    await diagnoses.save(
      buildDiagnosis({
        id: '00000000-0000-4000-8000-000000000002',
        createdAt: new Date('2026-10-13T02:00:00Z'),
      }),
    );
    await diagnoses.save(
      buildDiagnosis({
        id: '00000000-0000-4000-8000-000000000001',
        createdAt: new Date('2026-10-13T01:00:00Z'),
      }),
    );
    await diagnoses.save(buildDiagnosis({ userId: 'u2' }));
  });

  it('lists own diagnoses newest first with thumbnail and named diseases, paginated', async () => {
    const first = await useCase.execute({ userId: 'u1', limit: 2 });

    expect(first.diagnoses.map((d) => d.id.slice(-1))).toEqual(['3', '2']);
    expect(first.diagnoses[0]).toMatchObject({
      status: EDiagnosisStatus.COMPLETED,
      thumbnail: 'https://cdn/00000000-0000-4000-8000-000000000003',
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          diseaseName: 'name RICE_BLAST',
          confidenceLevel: EConfidenceLevel.HIGH,
        },
      ],
    });
    expect(first.diagnoses[1]).toMatchObject({ thumbnail: null, diseases: [] });
    expect(first.nextCursor).not.toBeNull();

    const second = await useCase.execute({
      userId: 'u1',
      limit: 2,
      cursor: first.nextCursor!,
    });
    expect(second.diagnoses.map((d) => d.id.slice(-1))).toEqual(['1']);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects a cursor it did not produce', async () => {
    await expect(
      useCase.execute({ userId: 'u1', limit: 2, cursor: 'nope' }),
    ).rejects.toBeInstanceOf(InvalidDiagnosisCursorException);
  });
});
