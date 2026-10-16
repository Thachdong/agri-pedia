import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
  TKnowledgeDiagnosisCrop,
} from '@modules/knowledge/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  Diagnosis,
  DiagnosisCropNotSupportedException,
  DiagnosisDailyLimitExceededException,
  DiagnosisInvalidImageException,
  DiagnosisUserNotAllowedException,
  EDiagnosisStatus,
  EPlantPart,
  MAX_DIAGNOSIS_IMAGES,
  MIN_DIAGNOSIS_IMAGES,
  TInvalidImage,
} from '../../domain';
import {
  DIAGNOSIS_JOB_RUNNER,
  IDiagnosisJobRunner,
} from '../ports/diagnosis-job-runner';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import {
  IImageProcessor,
  IMAGE_PROCESSOR,
  ImageUnreadableError,
  TProcessedImage,
} from '../ports/image-processor';
import {
  IVisionDiagnosisProvider,
  VISION_DIAGNOSIS_PROVIDER,
} from '../ports/vision-diagnosis.provider';

export type TCreateDiagnosisInput = {
  userId: string;
  cropType: string;
  note: string | null;
  /** File contents, in the order sent. */
  files: Buffer[];
  /** One per file, same order. */
  plantParts: EPlantPart[];
};

export type TCreateDiagnosisOutput = {
  id: string;
  status: EDiagnosisStatus;
};

/** Daily limit counts diagnoses since local midnight (Vietnam, UTC+7). */
const DAY_OFFSET_MS = 7 * 60 * 60 * 1000;

export function startOfLocalDay(now: Date): Date {
  const local = now.getTime() + DAY_OFFSET_MS;
  const day = 24 * 60 * 60 * 1000;
  return new Date(Math.floor(local / day) * day - DAY_OFFSET_MS);
}

/**
 * Checks the request (plant parts must belong to the crop), normalizes the images, records a PROCESSING diagnosis and starts the
 * pipeline in the background with the normalized images; returns without waiting for it.
 */
@Injectable()
export class CreateDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(IMAGE_PROCESSOR) private readonly images: IImageProcessor,
    @Inject(VISION_DIAGNOSIS_PROVIDER)
    private readonly vision: IVisionDiagnosisProvider,
    @Inject(DIAGNOSIS_JOB_RUNNER) private readonly jobs: IDiagnosisJobRunner,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TCreateDiagnosisInput): Promise<TCreateDiagnosisOutput> {
    const { maxImageBytes, dailyLimit } = this.config.get('diagnosis');

    const user = await this.userQuery.findRoleById(input.userId);
    if (!user?.isActive) {
      throw new DiagnosisUserNotAllowedException(input.userId);
    }
    const crop = await this.knowledgeQuery.findDiagnosisCrop(input.cropType);
    if (!crop?.enabled) {
      throw new DiagnosisCropNotSupportedException(input.cropType);
    }

    this.checkFiles(input, maxImageBytes, crop);
    const normalized = await this.normalizeAll(input.files);

    const since = startOfLocalDay(new Date());
    const diagnosis = await this.unitOfWork.runInTransaction(async () => {
      const today = await this.diagnoses.countByUserSince(input.userId, since);
      if (today >= dailyLimit) {
        throw new DiagnosisDailyLimitExceededException(dailyLimit);
      }
      const created = Diagnosis.create({
        userId: input.userId,
        cropType: input.cropType,
        note: input.note,
        ...this.vision.info(crop),
        kbVersion: crop.kbVersion,
        plantParts: input.plantParts,
      });
      await this.diagnoses.save(created);
      return created;
    });

    this.jobs.start({ diagnosisId: diagnosis.id, images: normalized });
    return { id: diagnosis.id, status: diagnosis.status };
  }

  private checkFiles(
    input: TCreateDiagnosisInput,
    maxImageBytes: number,
    crop: TKnowledgeDiagnosisCrop,
  ): void {
    const count = input.files.length;
    if (count < MIN_DIAGNOSIS_IMAGES || count > MAX_DIAGNOSIS_IMAGES) {
      throw new DiagnosisInvalidImageException([
        {
          index: null,
          reason: `Expected ${MIN_DIAGNOSIS_IMAGES}..${MAX_DIAGNOSIS_IMAGES} images, got ${count}`,
        },
      ]);
    }
    if (input.plantParts.length !== count) {
      throw new DiagnosisInvalidImageException([
        {
          index: null,
          reason: `Got ${count} images but ${input.plantParts.length} plant parts`,
        },
      ]);
    }
    const cropParts = crop.plantParts.map((part) => part.code);
    const wrongPart: TInvalidImage[] = input.plantParts.flatMap(
      (plantPart, index) =>
        cropParts.includes(plantPart)
          ? []
          : [
              {
                index,
                reason: `plantPart ${plantPart} is not a part of crop ${crop.code}`,
              },
            ],
    );
    if (wrongPart.length > 0) {
      throw new DiagnosisInvalidImageException(wrongPart);
    }
    const tooLarge: TInvalidImage[] = input.files.flatMap((file, index) =>
      file.length > maxImageBytes
        ? [{ index, reason: `Larger than ${maxImageBytes} bytes` }]
        : [],
    );
    if (tooLarge.length > 0) throw new DiagnosisInvalidImageException(tooLarge);
  }

  private async normalizeAll(files: Buffer[]): Promise<TProcessedImage[]> {
    const results = await Promise.allSettled(
      files.map((file) => this.images.normalize(file)),
    );
    const invalid: TInvalidImage[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        if (!(result.reason instanceof ImageUnreadableError)) {
          throw result.reason;
        }
        invalid.push({ index, reason: result.reason.message });
      }
    });
    if (invalid.length > 0) throw new DiagnosisInvalidImageException(invalid);
    return results.map(
      (result) => (result as PromiseFulfilledResult<TProcessedImage>).value,
    );
  }
}
