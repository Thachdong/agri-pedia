import { IConfigService } from '@shared/config';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryRealtimePublisher } from '@shared/realtime';
import { EDiagnosisStatus } from '../../domain';
import { buildDiagnosis, InMemoryDiagnosisRepository } from '../ports/fakes';
import { FailStaleDiagnosesUseCase } from './fail-stale-diagnoses.use-case';

const config = {
  get: () => ({ timeoutMs: 60000 }),
} as unknown as IConfigService;

describe('FailStaleDiagnosesUseCase', () => {
  it('fails PROCESSING diagnoses older than 3x the AI timeout and notifies owners', async () => {
    const diagnoses = new InMemoryDiagnosisRepository();
    const realtime = new InMemoryRealtimePublisher();
    const now = new Date('2026-10-13T10:00:00Z');
    const stale = buildDiagnosis({
      createdAt: new Date('2026-10-13T09:56:59Z'),
    });
    const recent = buildDiagnosis({
      createdAt: new Date('2026-10-13T09:57:30Z'),
    });
    const done = buildDiagnosis({
      status: EDiagnosisStatus.COMPLETED,
      createdAt: new Date('2026-10-13T08:00:00Z'),
    });
    for (const d of [stale, recent, done]) await diagnoses.save(d);

    const result = await new FailStaleDiagnosesUseCase(
      diagnoses,
      realtime,
      config,
      new InMemoryUnitOfWork(),
    ).execute(now);

    expect(result).toEqual({ failedCount: 1 });
    expect(stale.status).toBe(EDiagnosisStatus.FAILED);
    expect(recent.status).toBe(EDiagnosisStatus.PROCESSING);
    expect(done.status).toBe(EDiagnosisStatus.COMPLETED);
    expect(realtime.emitted).toEqual([
      {
        userId: 'u1',
        event: 'diagnosis.completed',
        payload: { id: stale.id, status: EDiagnosisStatus.FAILED },
      },
    ]);
  });
});
