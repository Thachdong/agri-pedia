import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { ELabelSource } from '../enums/label-source.enum';
import { TSampleRegion } from '../services/select-training-image';

export type TTrainingSampleProps = {
  diagnosisId: string;
  /** Order of the image in its diagnosis, from 0; unique with diagnosisId. */
  sortOrder: number;
  cropType: string;
  /** Part recognized by the AI, else the one chosen by the user. */
  plantPart: string;
  diseaseCode: string;
  variantCode: string | null;
  /** Diagnosis confidence score of the label (not calibrated). */
  confidenceScore: number;
  /** Labelled regions (boxes 0..1 on the image). */
  regions: TSampleRegion[];
  /** Copy of the image owned by the dataset: `datasets/<cropType>/<id>.jpg`. */
  imageKey: string;
  labelSource: ELabelSource;
  /** AI provider, models, prompt and KB versions that produced the label. */
  provider: string;
  model: string;
  promptVersion: string;
  kbVersion: string;
  createdAt: Date;
};

export type TCreateTrainingSampleProps = Omit<
  TTrainingSampleProps,
  'imageKey' | 'labelSource' | 'createdAt'
>;

/** Image of a diagnosis kept, with its AI label, to train a model later. */
export class TrainingSample extends AggregateRoot {
  private constructor(
    id: string,
    private props: TTrainingSampleProps,
  ) {
    super(id);
  }

  /** New AI_HIGH sample; its image key is derived from the crop and the new id. */
  static create(input: TCreateTrainingSampleProps): TrainingSample {
    const id = randomUUID();
    return new TrainingSample(id, {
      ...input,
      imageKey: `datasets/${input.cropType}/${id}.jpg`,
      labelSource: ELabelSource.AI_HIGH,
      createdAt: new Date(),
    });
  }

  static restore(id: string, props: TTrainingSampleProps): TrainingSample {
    return new TrainingSample(id, props);
  }

  get diagnosisId(): string {
    return this.props.diagnosisId;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get cropType(): string {
    return this.props.cropType;
  }

  get plantPart(): string {
    return this.props.plantPart;
  }

  get diseaseCode(): string {
    return this.props.diseaseCode;
  }

  get variantCode(): string | null {
    return this.props.variantCode;
  }

  get confidenceScore(): number {
    return this.props.confidenceScore;
  }

  get regions(): TSampleRegion[] {
    return this.props.regions;
  }

  get imageKey(): string {
    return this.props.imageKey;
  }

  get labelSource(): ELabelSource {
    return this.props.labelSource;
  }

  get provider(): string {
    return this.props.provider;
  }

  get model(): string {
    return this.props.model;
  }

  get promptVersion(): string {
    return this.props.promptVersion;
  }

  get kbVersion(): string {
    return this.props.kbVersion;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
