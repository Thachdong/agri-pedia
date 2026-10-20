import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  selectTrainingImage,
  TCandidateImage,
  TrainingSample,
  TSelectedImage,
} from '../../domain';
import {
  IImageQualityInspector,
  IMAGE_QUALITY_INSPECTOR,
  TImageQuality,
} from '../ports/image-quality-inspector';
import {
  ITrainingSampleRepository,
  TRAINING_SAMPLE_REPOSITORY,
} from '../ports/training-sample.repository';

export type TCollectTrainingImage = TCandidateImage & {
  /** Part chosen by the user. */
  plantPart: string;
  /** Part recognized by the AI; null when unsure. */
  detectedPart: string | null;
};

export type TCollectTrainingSamplesInput = {
  diagnosisId: string;
  cropType: string;
  provider: string;
  model: string;
  promptVersion: string;
  kbVersion: string;
  /** Two different diseases are HIGH on different images. */
  conflict: boolean;
  images: TCollectTrainingImage[];
};

export type TCollectTrainingSamplesOutput = { sampleIds: string[] };

/**
 * Keeps the unambiguous HIGH-confidence images of a completed diagnosis as training samples:
 * selection rule -> skip if already kept -> quality gate (size, sharpness, exposure) -> copy the image
 * to the dataset key -> save. Best-effort: a failing image is logged and skipped, never retried.
 */
@Injectable()
export class CollectTrainingSamplesUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(TRAINING_SAMPLE_REPOSITORY)
    private readonly samples: ITrainingSampleRepository,
    @Inject(IMAGE_QUALITY_INSPECTOR)
    private readonly inspector: IImageQualityInspector,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(CollectTrainingSamplesUseCase.name);
  }

  async execute(
    input: TCollectTrainingSamplesInput,
  ): Promise<TCollectTrainingSamplesOutput> {
    const sampleIds: string[] = [];
    // One at a time: background work, keeps memory flat.
    for (const image of input.images) {
      const selected = selectTrainingImage(image, input.conflict);
      if (!selected) continue;
      try {
        const sample = await this.collect(input, image, selected);
        if (sample) sampleIds.push(sample.id);
      } catch (error) {
        this.logger.warn('Training sample dropped', {
          diagnosisId: input.diagnosisId,
          sortOrder: image.sortOrder,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { sampleIds };
  }

  private async collect(
    input: TCollectTrainingSamplesInput,
    image: TCollectTrainingImage,
    selected: TSelectedImage,
  ): Promise<TrainingSample | null> {
    if (await this.samples.exists(input.diagnosisId, selected.sortOrder)) {
      return null;
    }
    const quality = await this.inspector.inspect(
      await this.storage.downloadFile(selected.key),
    );
    const rejection = this.rejection(quality);
    if (rejection) {
      this.logger.info('Training sample rejected by quality gate', {
        diagnosisId: input.diagnosisId,
        sortOrder: selected.sortOrder,
        rejection,
      });
      return null;
    }
    const sample = TrainingSample.create({
      diagnosisId: input.diagnosisId,
      sortOrder: selected.sortOrder,
      cropType: input.cropType,
      plantPart: image.detectedPart ?? image.plantPart,
      diseaseCode: selected.diseaseCode,
      variantCode: selected.variantCode,
      confidenceScore: selected.score,
      regions: selected.regions,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      kbVersion: input.kbVersion,
    });
    await this.storage.copyFile(selected.key, sample.imageKey);
    await this.unitOfWork.runInTransaction(() => this.samples.save(sample));
    return sample;
  }

  /** Why the image fails the quality gate; null when it passes. */
  private rejection(quality: TImageQuality): string | null {
    const { minShortSidePx, minSharpness, minBrightness, maxBrightness } =
      this.config.get('dataset');
    if (Math.min(quality.width, quality.height) < minShortSidePx) {
      return 'TOO_SMALL';
    }
    if (quality.sharpness < minSharpness) return 'BLURRY';
    if (quality.brightness < minBrightness) return 'TOO_DARK';
    if (quality.brightness > maxBrightness) return 'TOO_BRIGHT';
    return null;
  }
}
