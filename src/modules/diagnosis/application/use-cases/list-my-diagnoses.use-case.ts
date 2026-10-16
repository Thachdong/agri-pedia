import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeQueryPort,
  KNOWLEDGE_QUERY_PORT,
} from '@modules/knowledge/contracts';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import {
  EConfidenceLevel,
  EDiagnosisStatus,
  InvalidDiagnosisCursorException,
} from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
  TDiagnosisPageKey,
} from '../ports/diagnosis.repository';
import { namingOf } from './diagnosis-disease-names';

export type TListMyDiagnosesInput = {
  userId: string;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TDiagnosisListItem = {
  id: string;
  status: EDiagnosisStatus;
  cropType: string;
  /** Signed URL of the first stored image; null when none. */
  thumbnail: string | null;
  /** Empty while PROCESSING or when FAILED. */
  diseases: Array<{
    diseaseCode: string;
    diseaseName: string;
    confidenceLevel: EConfidenceLevel;
  }>;
  createdAt: Date;
};

export type TListMyDiagnosesOutput = {
  diagnoses: TDiagnosisListItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ c: createdAt ISO, i: id }`. */
const encodeCursor = (key: TDiagnosisPageKey): string =>
  Buffer.from(
    JSON.stringify({ c: key.createdAt.toISOString(), i: key.id }),
  ).toString('base64url');

const decodeCursor = (cursor: string): TDiagnosisPageKey => {
  try {
    const { c, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const createdAt = new Date(c);
    if (
      typeof c !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { createdAt, id: i };
  } catch {
    throw new InvalidDiagnosisCursorException();
  }
};

/** The caller's diagnoses, newest first, keyset-paginated, with thumbnail and disease names. */
@Injectable()
export class ListMyDiagnosesUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
    @Inject(KNOWLEDGE_QUERY_PORT)
    private readonly knowledgeQuery: IKnowledgeQueryPort,
  ) {}

  async execute(input: TListMyDiagnosesInput): Promise<TListMyDiagnosesOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;

    // One extra row tells whether a next page exists.
    const rows = await this.diagnoses.findByUser(input.userId, {
      after,
      limit: input.limit + 1,
    });
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    const diseaseCodes = [
      ...new Set(
        page.flatMap((d) =>
          (d.summary?.diseases ?? []).map((s) => s.diseaseCode),
        ),
      ),
    ];
    const [thumbnails, names] = await Promise.all([
      page.length > 0
        ? this.mediaQuery.findThumbnails(
            'DIAGNOSIS',
            page.map((d) => d.id),
          )
        : Promise.resolve([]),
      diseaseCodes.length > 0
        ? this.knowledgeQuery.getDiseaseNames(diseaseCodes)
        : Promise.resolve([]),
    ]);
    const thumbnailByOwner = new Map(thumbnails.map((t) => [t.ownerId, t.url]));
    const naming = namingOf(names);

    return {
      diagnoses: page.map((diagnosis) => ({
        id: diagnosis.id,
        status: diagnosis.status,
        cropType: diagnosis.cropType,
        thumbnail: thumbnailByOwner.get(diagnosis.id) ?? null,
        diseases:
          diagnosis.status === EDiagnosisStatus.COMPLETED
            ? (diagnosis.summary?.diseases ?? []).map((d) => ({
                diseaseCode: d.diseaseCode,
                diseaseName: naming(d.diseaseCode).diseaseName,
                confidenceLevel: d.confidence.level,
              }))
            : [],
        createdAt: diagnosis.createdAt,
      })),
      nextCursor,
    };
  }
}
