import { Diagnosis } from '../../../domain';
import { IDiagnosisRepository } from '../diagnosis.repository';

export class InMemoryDiagnosisRepository implements IDiagnosisRepository {
  readonly items = new Map<string, Diagnosis>();

  async save(diagnosis: Diagnosis): Promise<void> {
    this.items.set(diagnosis.id, diagnosis);
  }

  async countByUserSince(userId: string, since: Date): Promise<number> {
    return [...this.items.values()].filter(
      (d) => d.userId === userId && d.createdAt >= since,
    ).length;
  }
}
