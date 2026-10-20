import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { TDiagnosisSummary } from '../diagnosis-result.types';
import { EDiagnosisFeedback } from '../enums/diagnosis-feedback.enum';
import { EDiagnosisStatus } from '../enums/diagnosis-status.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { DiagnosisInvalidImageException } from '../exceptions/diagnosis-invalid-image.exception';
import { DiagnosisNotCompletedException } from '../exceptions/diagnosis-not-completed.exception';
import { DiagnosisNotProcessingException } from '../exceptions/diagnosis-not-processing.exception';
import { summarizeDiagnosis } from '../services/conclude';
import {
  DiagnosisImage,
  TDiagnosisImageResult,
} from './diagnosis-image.entity';

/** Images per diagnosis; the max is a setting (DiagnosisSettings.maxImages). */
export const MIN_DIAGNOSIS_IMAGES = 1;

export type TDiagnosisProps = {
  userId: string;
  cropType: string;
  note: string | null;
  status: EDiagnosisStatus;
  /** AI provider, models, prompt and KB versions used, to reproduce the result. */
  provider: string;
  model: string;
  promptVersion: string;
  kbVersion: string;
  summary: TDiagnosisSummary | null;
  /** Internal reason when FAILED (logged, never returned to clients). */
  failureReason: string | null;
  userFeedback: EDiagnosisFeedback | null;
  feedbackComment: string | null;
  createdAt: Date;
  completedAt: Date | null;
  /** By sortOrder. */
  images: DiagnosisImage[];
};

export type TCreateDiagnosisProps = {
  userId: string;
  cropType: string;
  note: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  kbVersion: string;
  /** One per image, in the order the files were sent. */
  plantParts: EPlantPart[];
  /** Images allowed per diagnosis. */
  maxImages: number;
};

/** Crop disease diagnosis of a set of images sent by a user. */
export class Diagnosis extends AggregateRoot {
  private constructor(
    id: string,
    private props: TDiagnosisProps,
  ) {
    super(id);
  }

  /** New PROCESSING diagnosis with one image per plant part (1..maxImages). */
  static create(input: TCreateDiagnosisProps): Diagnosis {
    const count = input.plantParts.length;
    if (count < MIN_DIAGNOSIS_IMAGES || count > input.maxImages) {
      throw new DiagnosisInvalidImageException([
        {
          index: null,
          reason: `Expected ${MIN_DIAGNOSIS_IMAGES}..${input.maxImages} images, got ${count}`,
        },
      ]);
    }
    return new Diagnosis(randomUUID(), {
      userId: input.userId,
      cropType: input.cropType,
      note: input.note,
      status: EDiagnosisStatus.PROCESSING,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      kbVersion: input.kbVersion,
      summary: null,
      failureReason: null,
      userFeedback: null,
      feedbackComment: null,
      createdAt: new Date(),
      completedAt: null,
      images: input.plantParts.map((part, index) =>
        DiagnosisImage.create(index, part),
      ),
    });
  }

  static restore(id: string, props: TDiagnosisProps): Diagnosis {
    return new Diagnosis(id, {
      ...props,
      images: [...props.images].sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  get userId(): string {
    return this.props.userId;
  }

  get cropType(): string {
    return this.props.cropType;
  }

  get note(): string | null {
    return this.props.note;
  }

  get status(): EDiagnosisStatus {
    return this.props.status;
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

  get summary(): TDiagnosisSummary | null {
    return this.props.summary;
  }

  get failureReason(): string | null {
    return this.props.failureReason;
  }

  get userFeedback(): EDiagnosisFeedback | null {
    return this.props.userFeedback;
  }

  get feedbackComment(): string | null {
    return this.props.feedbackComment;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get images(): DiagnosisImage[] {
    return this.props.images;
  }

  /** Stores the pipeline result of the image at `sortOrder`. */
  recordImageResult(sortOrder: number, result: TDiagnosisImageResult): void {
    this.assertProcessing();
    this.image(sortOrder).recordResult(result);
  }

  /** Links the stored file of the image at `sortOrder`. */
  attachImageMedia(sortOrder: number, mediaId: string): void {
    this.assertProcessing();
    this.image(sortOrder).attachMedia(mediaId);
  }

  /** PROCESSING -> COMPLETED with the summary merged over the images. */
  complete(now: Date = new Date()): void {
    this.assertProcessing();
    this.props.summary = summarizeDiagnosis(this.props.images);
    this.props.status = EDiagnosisStatus.COMPLETED;
    this.props.completedAt = now;
  }

  /** PROCESSING -> FAILED. */
  fail(reason: string, now: Date = new Date()): void {
    this.assertProcessing();
    this.props.status = EDiagnosisStatus.FAILED;
    this.props.failureReason = reason;
    this.props.completedAt = now;
  }

  /** Sets (or overwrites) the user's feedback; only on a COMPLETED diagnosis. */
  giveFeedback(feedback: EDiagnosisFeedback, comment: string | null): void {
    if (this.props.status !== EDiagnosisStatus.COMPLETED) {
      throw new DiagnosisNotCompletedException(this.id);
    }
    this.props.userFeedback = feedback;
    this.props.feedbackComment = comment;
  }

  private image(sortOrder: number): DiagnosisImage {
    const image = this.props.images.find((i) => i.sortOrder === sortOrder);
    if (!image) throw new RangeError(`No image with sortOrder ${sortOrder}`);
    return image;
  }

  private assertProcessing(): void {
    if (this.props.status !== EDiagnosisStatus.PROCESSING) {
      throw new DiagnosisNotProcessingException(this.id);
    }
  }
}
