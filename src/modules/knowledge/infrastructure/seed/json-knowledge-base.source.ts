import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  IKnowledgeBaseSource,
  TKnowledgeBaseSnapshot,
} from '../../application/ports';
import {
  Crop,
  Disease,
  EAgentType,
  ECropStage,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
  OBSERVATION_FEATURES,
  TDiseaseProfile,
  TLocalizedList,
  TLocalizedText,
  TObservationFeature,
} from '../../domain';

/** Crop names not carried by the KB file; every seeded crop is enabled for diagnosis. */
const CROP_NAMES_VI: Record<string, string> = { RICE: 'Lúa' };

const localizedList = z.object({
  vn: z.array(z.string()),
  en: z.array(z.string()),
});
type TRawList = { vn?: string[]; en?: string[] } | undefined;
type TRawText = { vn?: string; en?: string } | null | undefined;

/** zod output is all-optional without strictNullChecks; parsing already checked the shape. */
function list(raw: TRawList): TLocalizedList {
  return { vn: raw?.vn ?? [], en: raw?.en ?? [] };
}

function text(raw: TRawText): TLocalizedText | null {
  return raw ? { vn: raw.vn ?? '', en: raw.en ?? '' } : null;
}

const entrySchema = z.object({
  id: z.string().min(1),
  category: z.nativeEnum(EDiseaseCategory),
  agentType: z.nativeEnum(EAgentType),
  names: z.object({
    vn: z.string(),
    en: z.string(),
    scientific: z.string().optional(),
    aliasesVn: z.array(z.string()).optional(),
    aliasesEn: z.array(z.string()).optional(),
  }),
  affectedPart: z.object({ codes: z.array(z.nativeEnum(EPlantPart)) }),
  pathogens: localizedList.optional(),
  symptoms: localizedList,
  variants: z
    .array(
      z.object({
        id: z.string().min(1),
        names: z.object({
          vn: z.string(),
          en: z.string(),
          scientific: z.string().optional(),
        }),
        affectedPart: z.object({ vn: z.string(), en: z.string() }),
        symptoms: localizedList,
      }),
    )
    .optional(),
  epidemiology: z
    .object({
      transmissionMode: localizedList.optional(),
      cropStage: z.array(z.nativeEnum(ECropStage)).optional(),
    })
    .optional(),
  favorableConditions: localizedList.optional(),
  treatments: z
    .object({
      cultural: localizedList.optional(),
      biological: localizedList.optional(),
      nutrition: localizedList.optional(),
    })
    .optional(),
  diagnosisHelper: z
    .object({
      similarDiseases: z
        .array(
          z.object({
            id: z.string(),
            distinguishingFeature: z
              .object({ vn: z.string(), en: z.string() })
              .nullish(),
          }),
        )
        .optional(),
      visualKeywords: z.array(z.string()).optional(),
    })
    .optional(),
  verification: z.nativeEnum(EVerification),
  references: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .optional(),
});

const diseasesFileSchema = z.object({
  version: z.string().min(1),
  crop: z.string().min(1),
  diseases: z.array(entrySchema),
});

const weightsSchema = z.record(z.string(), z.record(z.string(), z.number()));

const profileFileSchema = z.object({
  kbVersion: z.string().min(1),
  features: z.record(
    z.string(),
    z.object({ level: z.string(), values: z.array(z.string()) }),
  ),
  profiles: z.record(
    z.string(),
    z.object({
      base: weightsSchema.optional(),
      variants: z.record(z.string(), weightsSchema).optional(),
    }),
  ),
});

type TEntry = z.infer<typeof entrySchema>;
type TWeights = z.infer<typeof weightsSchema>;

/** Reads `diseases.json` (KB) + `profile.json` (scoring weights) from `directory` (default: next to this file). */
export class JsonKnowledgeBaseSource implements IKnowledgeBaseSource {
  constructor(private readonly directory: string = __dirname) {}

  async load(): Promise<TKnowledgeBaseSnapshot> {
    const kb = diseasesFileSchema.parse(await this.readJson('diseases.json'));
    const profiles = profileFileSchema.parse(
      await this.readJson('profile.json'),
    );

    if (profiles.kbVersion !== kb.version) {
      throw new Error(
        `profile.json kbVersion ${profiles.kbVersion} does not match diseases.json version ${kb.version}`,
      );
    }
    assertSameFeatures(profiles.features);
    const entries = new Map(kb.diseases.map((entry) => [entry.id, entry]));
    for (const [code, profile] of Object.entries(profiles.profiles)) {
      assertProfileFits(code, profile, entries.get(code));
    }

    const cropNameVi = CROP_NAMES_VI[kb.crop];
    if (!cropNameVi) throw new Error(`No Vietnamese name for crop ${kb.crop}`);

    return {
      kbVersion: kb.version,
      crops: [
        Crop.restore({ code: kb.crop, nameVi: cropNameVi, enabled: true }),
      ],
      diseases: kb.diseases.map((entry) =>
        toDisease(
          entry,
          kb.crop,
          kb.version,
          (profiles.profiles[entry.id] as TDiseaseProfile | undefined) ?? null,
        ),
      ),
    };
  }

  private async readJson(file: string): Promise<unknown> {
    return JSON.parse(await readFile(join(this.directory, file), 'utf8'));
  }
}

function assertSameFeatures(
  features: Record<string, { level?: string; values?: string[] }>,
): void {
  const expected = JSON.stringify(OBSERVATION_FEATURES);
  const actual = JSON.stringify(
    Object.fromEntries(
      Object.entries(features).map(([name, f]) => [
        name,
        { level: f.level, values: f.values },
      ]),
    ),
  );
  if (actual !== expected) {
    throw new Error(
      'profile.json features differ from OBSERVATION_FEATURES (update both together)',
    );
  }
}

function assertWeightsKnown(code: string, weights: TWeights = {}): void {
  for (const [feature, values] of Object.entries(weights)) {
    const known = OBSERVATION_FEATURES[feature as TObservationFeature];
    if (!known) throw new Error(`${code}: unknown feature ${feature}`);
    for (const value of Object.keys(values)) {
      if (!(known.values as readonly string[]).includes(value)) {
        throw new Error(`${code}: unknown value ${feature}.${value}`);
      }
    }
  }
}

function assertProfileFits(
  code: string,
  profile: { base?: TWeights; variants?: Record<string, TWeights> },
  entry: TEntry | undefined,
): void {
  if (!entry) throw new Error(`profile.json: ${code} is not in diseases.json`);
  assertWeightsKnown(code, profile.base);
  const variantCodes = new Set((entry.variants ?? []).map((v) => v.id));
  for (const [variantCode, weights] of Object.entries(profile.variants ?? {})) {
    if (!variantCodes.has(variantCode)) {
      throw new Error(`profile.json: ${code} has no variant ${variantCode}`);
    }
    assertWeightsKnown(variantCode, weights);
  }
}

function toDisease(
  entry: TEntry,
  cropType: string,
  kbVersion: string,
  profile: TDiseaseProfile | null,
): Disease {
  return Disease.restore({
    code: entry.id,
    cropType,
    category: entry.category,
    agentType: entry.agentType,
    nameVi: entry.names.vn,
    nameEn: entry.names.en,
    scientificName: entry.names.scientific ?? null,
    aliasesVi: entry.names.aliasesVn ?? [],
    aliasesEn: entry.names.aliasesEn ?? [],
    affectedParts: entry.affectedPart.codes,
    verification: entry.verification,
    profile,
    kbVersion,
    content: {
      pathogens: list(entry.pathogens),
      symptoms: list(entry.symptoms),
      variants: (entry.variants ?? []).map((variant) => ({
        code: variant.id,
        names: {
          vn: variant.names.vn,
          en: variant.names.en,
          scientific: variant.names.scientific ?? null,
        },
        affectedPart: text(variant.affectedPart),
        symptoms: list(variant.symptoms),
      })),
      transmissionMode: entry.epidemiology?.transmissionMode
        ? list(entry.epidemiology.transmissionMode)
        : null,
      cropStages: entry.epidemiology?.cropStage ?? [],
      favorableConditions: list(entry.favorableConditions),
      treatments: {
        cultural: list(entry.treatments?.cultural),
        biological: list(entry.treatments?.biological),
        nutrition: list(entry.treatments?.nutrition),
      },
      similarDiseases: (entry.diagnosisHelper?.similarDiseases ?? []).map(
        (similar) => ({
          code: similar.id,
          distinguishingFeature: text(similar.distinguishingFeature),
        }),
      ),
      visualKeywords: entry.diagnosisHelper?.visualKeywords ?? [],
      references: (entry.references ?? []).map((ref) => ({
        title: ref.title,
        url: ref.url,
      })),
    },
  });
}
