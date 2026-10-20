import { TrainingSample } from '../../../domain';
import { ITrainingSampleRepository } from '../training-sample.repository';

export class InMemoryTrainingSampleRepository implements ITrainingSampleRepository {
  readonly items = new Map<string, TrainingSample>();

  async exists(diagnosisId: string, sortOrder: number): Promise<boolean> {
    return [...this.items.values()].some(
      (s) => s.diagnosisId === diagnosisId && s.sortOrder === sortOrder,
    );
  }

  async save(sample: TrainingSample): Promise<void> {
    this.items.set(sample.id, sample);
  }
}
