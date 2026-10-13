import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
  TKnowledgePlantPart,
} from '@modules/knowledge/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import { IRealtimePublisher, REALTIME_PUBLISHER } from '@shared/realtime';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  assessRegion,
  candidateCode,
  concludeImage,
  Diagnosis,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
  prepareRegions,
  TDescribedRegion,
  TDiagnosisImageResult,
  TDiagnosisRegion,
  TRegionCandidate,
} from '../../domain';
import { TDiagnosisJob } from '../ports/diagnosis-job-runner';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import {
  IImageProcessor,
  IMAGE_PROCESSOR,
  TProcessedImage,
} from '../ports/image-processor';
import {
  IVisionDiagnosisProvider,
  TVerifyOutput,
  VISION_DIAGNOSIS_PROVIDER,
} from '../ports/vision-diagnosis.provider';

/** Realtime event sent to the owner when processing ends. */
export const DIAGNOSIS_COMPLETED_REALTIME_EVENT = 'diagnosis.completed';

export type TStoredDiagnosisFile = {
  mediaId: string;
  key: string;
  sortOrder: number;
};

export type TProcessDiagnosisOutput = {
  /** COMPLETED / FAILED; null when the diagnosis was gone or already finished. */
  status: EDiagnosisStatus | null;
  storedFiles: TStoredDiagnosisFile[];
};

type TImageOutcome = {
  result: TDiagnosisImageResult;
  /** An AI step failed twice (request error, timeout or invalid output). */
  aiFailed: boolean;
};

const PLANT_PARTS = Object.values(EPlantPart) as string[];

/**
 * Background pipeline of one diagnosis: per image (in parallel) B1 describe -> prepare regions ->
 * B2 knowledge candidates -> B3 verify -> B4 confidence; then stores the images, completes
 * (or fails when every image failed at the AI) and notifies the owner in realtime.
 */
@Injectable()
export class ProcessDiagnosisUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(VISION_DIAGNOSIS_PROVIDER)
    private readonly vision: IVisionDiagnosisProvider,
    @Inject(IMAGE_PROCESSOR) private readonly images: IImageProcessor,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: IRealtimePublisher,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(ProcessDiagnosisUseCase.name);
  }

  async execute(job: TDiagnosisJob): Promise<TProcessDiagnosisOutput> {
    const diagnosis = await this.diagnoses.findById(job.diagnosisId);
    if (diagnosis?.status !== EDiagnosisStatus.PROCESSING) {
      this.logger.warn('Diagnosis not processing, job skipped', {
        diagnosisId: job.diagnosisId,
      });
      return { status: null, storedFiles: [] };
    }

    const outcomes = await Promise.all(
      diagnosis.images.map((image) =>
        this.processImage(
          diagnosis,
          job.images[image.sortOrder],
          image.plantPart,
        ),
      ),
    );
    const storedFiles = await this.storeImages(diagnosis.id, job.images);

    const finished = await this.unitOfWork.runInTransaction(async () => {
      // Reload: the diagnosis may have been failed as stale meanwhile.
      const current = await this.diagnoses.findById(diagnosis.id);
      if (current?.status !== EDiagnosisStatus.PROCESSING) return null;
      outcomes.forEach((outcome, sortOrder) =>
        current.recordImageResult(sortOrder, outcome.result),
      );
      for (const file of storedFiles) {
        current.attachImageMedia(file.sortOrder, file.mediaId);
      }
      if (outcomes.every((outcome) => outcome.aiFailed)) {
        current.fail('Every image failed at the AI provider');
      } else {
        current.complete();
      }
      await this.diagnoses.save(current);
      return current;
    });

    if (!finished) {
      this.logger.warn('Diagnosis finished elsewhere, results dropped', {
        diagnosisId: diagnosis.id,
      });
      return { status: null, storedFiles: [] };
    }
    this.realtime.emitToUser(
      finished.userId,
      DIAGNOSIS_COMPLETED_REALTIME_EVENT,
      { id: finished.id, status: finished.status },
    );
    return { status: finished.status, storedFiles };
  }

  private async processImage(
    diagnosis: Diagnosis,
    image: TProcessedImage,
    plantPart: EPlantPart,
  ): Promise<TImageOutcome> {
    const { maxRegionsPerImage, candidatesPerRegion } =
      this.config.get('diagnosis');

    let described;
    try {
      described = await this.withRetry('describe', diagnosis.id, () =>
        this.vision.describe({
          image,
          cropType: diagnosis.cropType,
          plantPart,
          maxRegions: maxRegionsPerImage,
        }),
      );
    } catch {
      return { result: uncertain(null, [], null, null), aiFailed: true };
    }

    const detectedPart = PLANT_PARTS.includes(described.result.detectedPart)
      ? (described.result.detectedPart as EPlantPart)
      : null;
    const prepared = prepareRegions(described.result, maxRegionsPerImage);
    if (prepared.status !== null) {
      return {
        result: {
          detectedPart,
          status: prepared.status,
          diseases: [],
          regions: [],
          b1Raw: described.raw,
          b3Raw: null,
        },
        aiFailed: false,
      };
    }

    // B2
    const candidates = await this.knowledgeQuery.findCandidates({
      cropType: diagnosis.cropType,
      part: (detectedPart ?? plantPart) as TKnowledgePlantPart,
      wholeImage: described.result.wholeImage,
      regions: prepared.regions.map((region) => region.observations),
      limit: candidatesPerRegion,
    });
    const regionCandidates: TRegionCandidate[][] = candidates.map((list) =>
      list.map((c) => ({
        diseaseCode: c.diseaseCode,
        variantCode: c.variantCode,
        matchScore: Math.round(c.matchScore * 1000) / 1000,
      })),
    );
    const toVerify = prepared.regions
      .map((region, index) => ({ region, index }))
      .filter(({ index }) => regionCandidates[index].length > 0);

    // B3
    let verified: TVerifyOutput | null = null;
    if (toVerify.length > 0) {
      try {
        verified = await this.verify(
          diagnosis.id,
          image,
          toVerify,
          regionCandidates,
        );
      } catch {
        return {
          result: uncertain(
            detectedPart,
            prepared.regions.map((region, index) =>
              toRegion(region, regionCandidates[index], null),
            ),
            described.raw,
            null,
          ),
          aiFailed: true,
        };
      }
    }

    // B4
    const answers = new Map(
      (verified?.regions ?? []).map((answer) => [answer.regionIndex, answer]),
    );
    const regions = prepared.regions.flatMap((region, index) => {
      const assessed = assessRegion(
        regionCandidates[index],
        answers.get(index) ?? null,
      );
      return assessed
        ? [toRegion(region, regionCandidates[index], assessed)]
        : [];
    });
    const conclusion = concludeImage(regions);
    return {
      result: {
        detectedPart,
        status: conclusion.status,
        diseases: conclusion.diseases,
        regions,
        b1Raw: described.raw,
        b3Raw: verified?.raw ?? null,
      },
      aiFailed: false,
    };
  }

  private async verify(
    diagnosisId: string,
    image: TProcessedImage,
    toVerify: Array<{ region: TDescribedRegion; index: number }>,
    regionCandidates: TRegionCandidate[][],
  ): Promise<TVerifyOutput> {
    const codes = [
      ...new Set(
        toVerify.flatMap(({ index }) =>
          regionCandidates[index].map(candidateCode),
        ),
      ),
    ];
    const [thumbnail, crops, cards] = await Promise.all([
      this.images.thumbnail(image),
      Promise.all(
        toVerify.map(({ region }) => this.images.crop(image, region.box)),
      ),
      this.knowledgeQuery.getDiseaseCards(codes),
    ]);
    return this.withRetry('verify', diagnosisId, () =>
      this.vision.verify({
        thumbnail,
        regions: toVerify.map(({ region, index }, i) => ({
          regionIndex: index,
          crop: crops[i],
          observations: region.observations,
          descriptionEn: region.descriptionEn,
          candidateCodes: regionCandidates[index].map(candidateCode),
        })),
        cards,
      }),
    );
  }

  /** Uploads every normalized image; a failed upload is logged and left without media. */
  private async storeImages(
    diagnosisId: string,
    images: TProcessedImage[],
  ): Promise<TStoredDiagnosisFile[]> {
    const results = await Promise.all(
      images.map(async (image, sortOrder) => {
        const mediaId = randomUUID();
        const key = `diagnoses/${diagnosisId}/${mediaId}.jpg`;
        try {
          await this.storage.uploadFile(key, image.data, image.mimeType);
          return [{ mediaId, key, sortOrder }];
        } catch (error) {
          this.logger.error('Diagnosis image upload failed', error, {
            diagnosisId,
            sortOrder,
          });
          return [];
        }
      }),
    );
    return results.flat();
  }

  /** One retry; the last error is logged and rethrown. */
  private async withRetry<T>(
    step: string,
    diagnosisId: string,
    call: () => Promise<T>,
  ): Promise<T> {
    try {
      return await call();
    } catch (first) {
      this.logger.warn('AI step failed, retrying', {
        diagnosisId,
        step,
        reason: first instanceof Error ? first.message : String(first),
      });
      try {
        return await call();
      } catch (second) {
        this.logger.error('AI step failed twice', second, {
          diagnosisId,
          step,
        });
        throw second;
      }
    }
  }
}

function toRegion(
  region: TDescribedRegion,
  candidates: TRegionCandidate[],
  assessed: Pick<TDiagnosisRegion, 'verdict' | 'confidence'> | null,
): TDiagnosisRegion {
  return {
    box: region.box,
    observations: region.observations,
    descriptionEn: region.descriptionEn,
    descriptionVi: region.descriptionVi,
    candidates,
    verdict: assessed?.verdict ?? null,
    confidence: assessed?.confidence ?? null,
  };
}

function uncertain(
  detectedPart: EPlantPart | null,
  regions: TDiagnosisRegion[],
  b1Raw: unknown,
  b3Raw: unknown,
): TDiagnosisImageResult {
  return {
    detectedPart,
    status: EDiagnosisImageStatus.UNCERTAIN,
    diseases: [],
    regions,
    b1Raw,
    b3Raw,
  };
}
