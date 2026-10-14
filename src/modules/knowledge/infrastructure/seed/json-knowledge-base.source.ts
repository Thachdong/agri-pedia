import { readdir, readFile } from 'node:fs/promises';
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
  TCropProps,
  TDiseaseProfile,
  TLocalizedList,
  TLocalizedText,
  TObservationFeatures,
  UNSURE,
} from '../../domain';

/** Crop whose disease codes predate the `<CROP>_` prefix rule (kept: saved diagnoses refer to them). */
const UNPREFIXED_CROP = 'RICE';

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

const featureSchema = z.object({
  level: z.enum(['region', 'image']),
  values: z.array(z.string()).min(1),
  normal: z.array(z.string()).optional(),
  descriptionEn: z.string().optional(),
  hintsEn: z.record(z.string(), z.string()).optional(),
});

const profileFileSchema = z.object({
  kbVersion: z.string().min(1),
  features: z.record(z.string(), featureSchema),
  profiles: z.record(
    z.string(),
    z.object({
      base: weightsSchema.optional(),
      variants: z.record(z.string(), weightsSchema).optional(),
    }),
  ),
});

const cropFileSchema = z.object({
  code: z.string().min(1),
  nameVi: z.string().min(1),
  nameEn: z.string().min(1),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  plantParts: z
    .array(
      z.object({
        code: z.nativeEnum(EPlantPart),
        nameVi: z.string().min(1),
        promptEn: z.string().min(1),
      }),
    )
    .min(1),
  cropStages: z.array(
    z.object({ code: z.nativeEnum(ECropStage), nameVi: z.string().min(1) }),
  ),
  prompt: z.object({
    subjectEn: z.string().min(1),
    wholeImageCuesEn: z.string().min(1),
  }),
});

type TEntry = z.infer<typeof entrySchema>;
type TWeights = z.infer<typeof weightsSchema>;
type TCropPack = { crop: Crop; diseases: Disease[] };

/**
 * Reads one crop pack per sub-directory of `directory` (default: `crops/` next to this file):
 * `crop.json` (crop + diagnosis config), `diseases.json` (KB), `profile.json` (feature enums + weights).
 * Every check failure throws, so the app does not start on an inconsistent KB.
 */
export class JsonKnowledgeBaseSource implements IKnowledgeBaseSource {
  constructor(private readonly directory: string = join(__dirname, 'crops')) {}

  async load(): Promise<TKnowledgeBaseSnapshot> {
    const entries = await readdir(this.directory, { withFileTypes: true });
    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const packs = await Promise.all(
      folders.map((folder) => this.loadPack(folder)),
    );

    const cropOf = new Map<string, string>();
    for (const { crop, diseases } of packs) {
      for (const disease of diseases) {
        const other = cropOf.get(disease.code);
        if (other) {
          throw new Error(
            `Disease code ${disease.code} is used by crops ${other} and ${crop.code}`,
          );
        }
        cropOf.set(disease.code, crop.code);
      }
    }
    return {
      crops: packs.map((pack) => pack.crop),
      diseases: packs.flatMap((pack) => pack.diseases),
    };
  }

  private async loadPack(folder: string): Promise<TCropPack> {
    const cropFile = cropFileSchema.parse(
      await this.readJson(folder, 'crop.json'),
    );
    const kb = diseasesFileSchema.parse(
      await this.readJson(folder, 'diseases.json'),
    );
    const profiles = profileFileSchema.parse(
      await this.readJson(folder, 'profile.json'),
    );
    const fail = (message: string): never => {
      throw new Error(`crops/${folder}: ${message}`);
    };

    if (cropFile.code !== folder || kb.crop !== folder) {
      fail(
        `crop.json code ${cropFile.code} and diseases.json crop ${kb.crop} must equal the folder name`,
      );
    }
    if (profiles.kbVersion !== kb.version) {
      fail(
        `profile.json kbVersion ${profiles.kbVersion} does not match diseases.json version ${kb.version}`,
      );
    }
    const features = profiles.features as TObservationFeatures;
    assertFeatures(features, fail);
    assertEntries(cropFile, kb.diseases, fail);
    const entries = new Map(kb.diseases.map((entry) => [entry.id, entry]));
    for (const [code, profile] of Object.entries(profiles.profiles)) {
      assertProfileFits(code, profile, entries.get(code), features, fail);
    }

    return {
      crop: Crop.restore({
        ...(cropFile as Omit<TCropProps, 'kbVersion' | 'features'>),
        kbVersion: kb.version,
        features,
      }),
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

  private async readJson(folder: string, file: string): Promise<unknown> {
    return JSON.parse(
      await readFile(join(this.directory, folder, file), 'utf8'),
    );
  }
}

type TFail = (message: string) => never;

/** Feature enums the diagnosis pipeline relies on. */
function assertFeatures(features: TObservationFeatures, fail: TFail): void {
  for (const [name, feature] of Object.entries(features)) {
    if (!feature.values.includes(UNSURE)) fail(`${name} has no ${UNSURE}`);
    if (feature.level === 'image') {
      if (!feature.normal) fail(`image feature ${name} has no normal values`);
      for (const value of feature.normal) {
        if (!feature.values.includes(value)) {
          fail(`${name}.normal has unknown value ${value}`);
        }
      }
    } else if (feature.normal) {
      fail(`region feature ${name} must not have normal values`);
    }
    for (const value of Object.keys(feature.hintsEn ?? {})) {
      if (!feature.values.includes(value)) {
        fail(`${name}.hintsEn has unknown value ${value}`);
      }
    }
  }
  // The whole-image region (no distinct lesion) is described with these values.
  for (const [name, value] of [
    ['lesionShape', 'NO_DISTINCT_LESION'],
    ['distribution', 'WHOLE_ORGAN'],
  ]) {
    if (features[name]?.level !== 'region') {
      fail(`region feature ${name} is missing`);
    }
    if (!features[name].values.includes(value)) {
      fail(`${name} has no ${value}`);
    }
  }
}

/** Codes, parts and stages of the KB entries fit the crop. */
function assertEntries(
  crop: z.infer<typeof cropFileSchema>,
  entries: TEntry[],
  fail: TFail,
): void {
  const parts = new Set<string>(crop.plantParts.map((part) => part.code));
  const stages = new Set<string>(crop.cropStages.map((stage) => stage.code));
  const prefix = `${crop.code}_`;
  for (const entry of entries) {
    if (crop.code !== UNPREFIXED_CROP) {
      for (const id of [entry.id, ...(entry.variants ?? []).map((v) => v.id)]) {
        if (!id.startsWith(prefix)) fail(`${id} has no ${prefix} prefix`);
      }
    }
    for (const part of entry.affectedPart.codes) {
      if (!parts.has(part)) {
        fail(`${entry.id} affects ${part}, not a plant part of the crop`);
      }
    }
    for (const stage of entry.epidemiology?.cropStage ?? []) {
      if (!stages.has(stage)) {
        fail(`${entry.id} uses crop stage ${stage}, not a stage of the crop`);
      }
    }
  }
}

function assertWeightsKnown(
  code: string,
  weights: TWeights = {},
  features: TObservationFeatures,
  fail: TFail,
): void {
  for (const [feature, values] of Object.entries(weights)) {
    const known = features[feature];
    if (!known) fail(`${code}: unknown feature ${feature}`);
    for (const value of Object.keys(values)) {
      if (!known.values.includes(value)) {
        fail(`${code}: unknown value ${feature}.${value}`);
      }
    }
  }
}

function assertProfileFits(
  code: string,
  profile: { base?: TWeights; variants?: Record<string, TWeights> },
  entry: TEntry | undefined,
  features: TObservationFeatures,
  fail: TFail,
): void {
  if (!entry) fail(`profile.json: ${code} is not in diseases.json`);
  assertWeightsKnown(code, profile.base, features, fail);
  const variantCodes = new Set((entry.variants ?? []).map((v) => v.id));
  for (const [variantCode, weights] of Object.entries(profile.variants ?? {})) {
    if (!variantCodes.has(variantCode)) {
      fail(`profile.json: ${code} has no variant ${variantCode}`);
    }
    assertWeightsKnown(variantCode, weights, features, fail);
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
