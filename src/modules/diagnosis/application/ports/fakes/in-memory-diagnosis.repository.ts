import { Diagnosis, EDiagnosisStatus } from '../../../domain';
import {
  IDiagnosisRepository,
  TDiagnosisPageKey,
} from '../diagnosis.repository';

const newestFirst = (a: Diagnosis, b: Diagnosis): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

export class InMemoryDiagnosisRepository implements IDiagnosisRepository {
  readonly items = new Map<string, Diagnosis>();

  async findById(id: string): Promise<Diagnosis | null> {
    return this.items.get(id) ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<Diagnosis | null> {
    const diagnosis = this.items.get(id);
    return diagnosis?.userId === userId ? diagnosis : null;
  }

  async findByUser(
    userId: string,
    page: { after?: TDiagnosisPageKey; limit: number },
  ): Promise<Diagnosis[]> {
    const { after } = page;
    return [...this.items.values()]
      .filter((d) => d.userId === userId)
      .sort(newestFirst)
      .filter(
        (d) =>
          !after ||
          d.createdAt < after.createdAt ||
          (d.createdAt.getTime() === after.createdAt.getTime() &&
            d.id < after.id),
      )
      .slice(0, page.limit);
  }

  async findProcessingCreatedBefore(before: Date): Promise<Diagnosis[]> {
    return [...this.items.values()].filter(
      (d) => d.status === EDiagnosisStatus.PROCESSING && d.createdAt < before,
    );
  }

  async save(diagnosis: Diagnosis): Promise<void> {
    this.items.set(diagnosis.id, diagnosis);
  }

  async countByUserSince(userId: string, since: Date): Promise<number> {
    return [...this.items.values()].filter(
      (d) => d.userId === userId && d.createdAt >= since,
    ).length;
  }
}
