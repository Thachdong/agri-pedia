import { IKnowledgeQueryPort } from '@modules/knowledge/contracts';
import { IMediaQueryPort } from '@modules/media/contracts';
import {
  buildDiagnosis,
  InMemoryDiagnosisRepository,
} from '../../application/ports/fakes';
import { DiagnosisReportBuilder } from '../../application/use-cases';
import { EDiagnosisStatus } from '../../domain';
import { DiagnosisQueryService } from './diagnosis-query.service';

const mediaQuery = {
  findUrls: async (_type: string, ownerId: string, ids: string[]) =>
    ids.map((mediaId) => ({
      mediaId,
      url: `https://cdn/${ownerId}/${mediaId}`,
    })),
} as unknown as IMediaQueryPort;

const knowledgeQuery = {
  getDiseaseNames: async () => [],
} as unknown as IKnowledgeQueryPort;

describe('DiagnosisQueryService', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let service: DiagnosisQueryService;

  beforeEach(() => {
    diagnoses = new InMemoryDiagnosisRepository();
    service = new DiagnosisQueryService(
      diagnoses,
      new DiagnosisReportBuilder(mediaQuery, knowledgeQuery),
    );
  });

  it('finds who owns a diagnosis and its status', async () => {
    const diagnosis = buildDiagnosis({
      userId: 'farmer-1',
      status: EDiagnosisStatus.COMPLETED,
    });
    diagnoses.items.set(diagnosis.id, diagnosis);

    expect(await service.findOwnership(diagnosis.id)).toEqual({
      diagnosisId: diagnosis.id,
      userId: 'farmer-1',
      status: 'COMPLETED',
    });
  });

  it("returns any user's report, image URLs signed", async () => {
    const diagnosis = buildDiagnosis({
      userId: 'farmer-1',
      images: [{ mediaId: 'm1' }],
    });
    diagnoses.items.set(diagnosis.id, diagnosis);

    const report = await service.findReport(diagnosis.id);

    expect(report).toMatchObject({
      id: diagnosis.id,
      status: 'PROCESSING',
      cropType: 'RICE',
      images: [
        { index: 0, mediaId: 'm1', url: `https://cdn/${diagnosis.id}/m1` },
      ],
    });
  });

  it('returns null for an unknown diagnosis', async () => {
    expect(await service.findOwnership('nope')).toBeNull();
    expect(await service.findReport('nope')).toBeNull();
  });
});
