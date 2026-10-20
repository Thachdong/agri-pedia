import { TrainingSample } from '../../domain';

export interface ITrainingSampleRepository {
  /** A sample was already kept for the image at `sortOrder` of the diagnosis. */
  exists(diagnosisId: string, sortOrder: number): Promise<boolean>;
  save(sample: TrainingSample): Promise<void>;
}

export const TRAINING_SAMPLE_REPOSITORY = Symbol('TRAINING_SAMPLE_REPOSITORY');
