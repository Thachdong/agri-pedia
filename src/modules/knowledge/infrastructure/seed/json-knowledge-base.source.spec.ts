import { cp, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Disease, EPlantPart, scoreCandidates } from '../../domain';
import { JsonKnowledgeBaseSource } from './json-knowledge-base.source';

const CROPS = join(__dirname, 'crops');

type TScenario = {
  name: string;
  part: EPlantPart;
  observations: Record<string, string>;
  expectTop1: string;
};

function top3(diseases: Disease[], scenario: TScenario) {
  const units = diseases
    .filter((d) => d.isCandidateFor(scenario.part))
    .flatMap((d) => d.scoringUnits());
  return scoreCandidates(units, scenario.observations, 3);
}

type TPackFiles = { crop: any; diseases: any; profile: any };

/** Copy of the shipped RICE pack in a temp `crops/` dir, edited; `extra` adds more packs. */
async function packsWith(
  edit: (files: TPackFiles) => void,
  extra: Record<string, TPackFiles> = {},
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'kb-'));
  const read = async (folder: string, file: string) =>
    JSON.parse(await readFile(join(CROPS, folder, file), 'utf8'));
  const rice: TPackFiles = {
    crop: await read('RICE', 'crop.json'),
    diseases: await read('RICE', 'diseases.json'),
    profile: await read('RICE', 'profile.json'),
  };
  edit(rice);
  for (const [folder, files] of Object.entries({ RICE: rice, ...extra })) {
    await cp(join(CROPS, 'RICE'), join(dir, folder), { recursive: true });
    await writeFile(join(dir, folder, 'crop.json'), JSON.stringify(files.crop));
    await writeFile(
      join(dir, folder, 'diseases.json'),
      JSON.stringify(files.diseases),
    );
    await writeFile(
      join(dir, folder, 'profile.json'),
      JSON.stringify(files.profile),
    );
  }
  return dir;
}

/** A minimal second crop pack whose single entry is prefixed with its code. */
function cornPack(entryId = 'CORN_RUST'): TPackFiles {
  return {
    crop: {
      code: 'CORN',
      slug: 'ngo',
      nameVi: 'Ngô',
      nameEn: 'corn',
      enabled: false,
      sortOrder: 3,
      plantParts: [{ code: 'LEAF', nameVi: 'Lá', promptEn: 'leaf' }],
      cropStages: [],
      prompt: { subjectEn: 'corn plants', wholeImageCuesEn: 'stunting' },
    },
    diseases: {
      version: '2026-11-01',
      crop: 'CORN',
      diseases: [
        {
          id: entryId,
          category: 'DISEASE',
          agentType: 'FUNGUS',
          names: { vn: 'Gỉ sắt', en: 'Rust' },
          affectedPart: { codes: ['LEAF'] },
          symptoms: { vn: [], en: ['Orange pustules'] },
          verification: 'SOURCED',
        },
      ],
    },
    profile: {
      kbVersion: '2026-11-01',
      features: {
        lesionShape: {
          level: 'region',
          values: ['PUSTULE', 'NO_DISTINCT_LESION', 'UNSURE'],
        },
        distribution: {
          level: 'region',
          values: ['SCATTERED', 'WHOLE_ORGAN', 'UNSURE'],
        },
      },
      profiles: { [entryId]: { base: { lesionShape: { PUSTULE: 3 } } } },
    },
  };
}

async function expectRejected(dir: string, message: string): Promise<void> {
  await expect(new JsonKnowledgeBaseSource(dir).load()).rejects.toThrow(
    message,
  );
}

describe('JsonKnowledgeBaseSource (shipped crop packs)', () => {
  it('loads the RICE pack with its diagnosis configuration', async () => {
    const snapshot = await new JsonKnowledgeBaseSource().load();

    const rice = snapshot.crops.find((c) => c.code === 'RICE');
    expect(rice).toBeDefined();
    expect([rice.nameVi, rice.nameEn, rice.enabled, rice.kbVersion]).toEqual([
      'Lúa',
      'rice',
      true,
      '2026-10-12',
    ]);
    expect(rice.plantParts.map((p) => p.code)).toEqual([
      'LEAF',
      'SHEATH',
      'STEM',
      'PANICLE',
      'ROOT',
      'WHOLE_PLANT',
    ]);
    expect(rice.features.panicle.normal).toEqual(['NOT_VISIBLE', 'NORMAL']);
    expect(rice.features.lesionShape.hintsEn.SPINDLE_DIAMOND).toBeDefined();

    const riceDiseases = snapshot.diseases.filter((d) => d.cropType === 'RICE');
    expect(riceDiseases).toHaveLength(51);
    const blast = riceDiseases.find((d) => d.code === 'RICE_BLAST');
    expect(blast?.content.variants.map((v) => v.code)).toEqual([
      'RICE_BLAST__V1',
      'RICE_BLAST__V2',
      'RICE_BLAST__V3',
    ]);
    expect(blast?.profile?.base).toBeDefined();
  });

  it('loads the DURIAN pack disabled, with its own parts, stages and features', async () => {
    const snapshot = await new JsonKnowledgeBaseSource().load();

    const durian = snapshot.crops.find((c) => c.code === 'DURIAN');
    expect(durian).toBeDefined();
    expect([durian.nameVi, durian.enabled, durian.kbVersion]).toEqual([
      'Sầu riêng',
      false,
      '2026-10-15',
    ]);
    expect(durian.plantParts.map((p) => p.code)).toContain('ARIL');
    expect(durian.cropStages.map((s) => s.code)).toContain('TREE_RECOVERY');
    expect(durian.features.fruit.level).toBe('image');
    expect(durian.features).not.toHaveProperty('panicle');

    const diseases = snapshot.diseases.filter((d) => d.cropType === 'DURIAN');
    expect(diseases).toHaveLength(27);
    expect(diseases.every((d) => d.code.startsWith('DURIAN_'))).toBe(true);
    expect(diseases.filter((d) => d.profile !== null)).toHaveLength(27);
    expect(
      diseases.filter((d) => d.verification === 'SECONDARY').length,
    ).toBeGreaterThan(0);
  });

  it('loads the COFFEE pack disabled, with its own parts, stages and features', async () => {
    const snapshot = await new JsonKnowledgeBaseSource().load();

    const coffee = snapshot.crops.find((c) => c.code === 'COFFEE');
    expect(coffee).toBeDefined();
    expect([
      coffee.nameVi,
      coffee.slug,
      coffee.enabled,
      coffee.kbVersion,
    ]).toEqual(['Cà phê', 'ca-phe', false, '2026-10-30']);
    expect(coffee.plantParts.map((p) => p.code)).toContain('FRUIT');
    expect(coffee.cropStages.map((s) => s.code)).not.toContain('FLUSHING');
    expect(coffee.features.berries.level).toBe('image');
    expect(coffee.features).not.toHaveProperty('panicle');

    const diseases = snapshot.diseases.filter((d) => d.cropType === 'COFFEE');
    expect(diseases).toHaveLength(25);
    expect(diseases.every((d) => d.code.startsWith('COFFEE_'))).toBe(true);
    expect(diseases.filter((d) => d.profile !== null)).toHaveLength(25);
    const rust = diseases.find((d) => d.code === 'COFFEE_LEAF_RUST');
    expect(rust?.profile?.base).toBeDefined();
    const eyeSpot = diseases.find((d) => d.code === 'COFFEE_BROWN_EYE_SPOT');
    expect(eyeSpot?.content.variants.map((v) => v.code)).toEqual([
      'COFFEE_BROWN_EYE_SPOT__LEAF',
      'COFFEE_BROWN_EYE_SPOT__BERRY',
    ]);
    expect(snapshot.crops.map((c) => c.code)).toEqual([
      'COFFEE',
      'DURIAN',
      'RICE',
    ]);
  });

  it('scores the rice scenarios exactly as the single-crop loader did', async () => {
    const baseline = JSON.parse(
      await readFile(
        join(__dirname, '__fixtures__', 'rice-b2-baseline.json'),
        'utf8',
      ),
    ) as { scenarios: Array<TScenario & { top3: unknown }> };
    const { diseases } = await new JsonKnowledgeBaseSource().load();
    const rice = diseases.filter((d) => d.cropType === 'RICE');

    for (const scenario of baseline.scenarios) {
      expect({ name: scenario.name, top3: top3(rice, scenario) }).toEqual({
        name: scenario.name,
        top3: scenario.top3,
      });
    }
  });

  it('ranks the expected unit first in every scenario of every crop pack', async () => {
    const { crops, diseases } = await new JsonKnowledgeBaseSource().load();
    const folders = (await readdir(CROPS, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(folders.sort()).toEqual(crops.map((c) => c.code).sort());

    for (const folder of folders) {
      const { scenarios } = JSON.parse(
        await readFile(join(CROPS, folder, 'scenarios.json'), 'utf8'),
      ) as { scenarios: TScenario[] };
      expect(scenarios.length).toBeGreaterThan(0);
      const own = diseases.filter((d) => d.cropType === folder);
      for (const scenario of scenarios) {
        const [first] = top3(own, scenario);
        expect({
          crop: folder,
          name: scenario.name,
          top1: first ? (first.variantCode ?? first.diseaseCode) : null,
        }).toEqual({
          crop: folder,
          name: scenario.name,
          top1: scenario.expectTop1,
        });
      }
    }
  });
});

describe('JsonKnowledgeBaseSource (several packs)', () => {
  it('loads every pack with its own kbVersion', async () => {
    const dir = await packsWith(() => undefined, { CORN: cornPack() });

    const snapshot = await new JsonKnowledgeBaseSource(dir).load();

    expect(
      snapshot.crops.map((c) => [c.code, c.slug, c.kbVersion, c.enabled]),
    ).toEqual([
      ['CORN', 'ngo', '2026-11-01', false],
      ['RICE', 'lua', '2026-10-12', true],
    ]);
    expect(
      snapshot.diseases.filter((d) => d.cropType === 'CORN').map((d) => d.code),
    ).toEqual(['CORN_RUST']);
  });

  it('rejects a disease code used by two crops', async () => {
    // RICE codes have no prefix rule, so a RICE entry may clash with another crop's code.
    const dir = await packsWith(
      ({ diseases }) => {
        diseases.diseases.push({ ...diseases.diseases[0], id: 'CORN_RUST' });
      },
      { CORN: cornPack() },
    );
    await expectRejected(dir, 'CORN_RUST is used by crops CORN and RICE');
  });

  it('rejects a crop slug used by two crops', async () => {
    const corn = cornPack();
    corn.crop.slug = 'lua';
    const dir = await packsWith(() => undefined, { CORN: corn });

    await expectRejected(dir, 'Crop slug lua is used by crops CORN and RICE');
  });

  it('rejects a crop slug that is not a lowercase URL segment', async () => {
    const corn = cornPack();
    corn.crop.slug = 'Ngô';
    const dir = await packsWith(() => undefined, { CORN: corn });

    await expect(new JsonKnowledgeBaseSource(dir).load()).rejects.toThrow();
  });

  it('rejects entries of a new crop without the crop prefix', async () => {
    const dir = await packsWith(() => undefined, {
      CORN: cornPack('RUST'),
    });
    await expectRejected(dir, 'RUST has no CORN_ prefix');
  });
});

describe('JsonKnowledgeBaseSource (inconsistent pack)', () => {
  it('rejects a crop code that differs from the folder', async () => {
    const dir = await packsWith(({ crop }) => {
      crop.code = 'PADDY';
    });
    await expectRejected(dir, 'must equal the folder name');
  });

  it('rejects a profile built for another KB version', async () => {
    const dir = await packsWith(({ profile }) => {
      profile.kbVersion = '1999-01-01';
    });
    await expectRejected(dir, 'does not match');
  });

  it('rejects a feature without UNSURE', async () => {
    const dir = await packsWith(({ profile }) => {
      profile.features.halo.values = ['YELLOW', 'NONE'];
    });
    await expectRejected(dir, 'halo has no UNSURE');
  });

  it('rejects an image feature without normal values, or with unknown ones', async () => {
    const missing = await packsWith(({ profile }) => {
      delete profile.features.plantForm.normal;
    });
    await expectRejected(missing, 'image feature plantForm has no normal');

    const unknown = await packsWith(({ profile }) => {
      profile.features.plantForm.normal = ['FINE'];
    });
    await expectRejected(unknown, 'plantForm.normal has unknown value FINE');
  });

  it('rejects normal values on a region feature', async () => {
    const dir = await packsWith(({ profile }) => {
      profile.features.halo.normal = ['NONE'];
    });
    await expectRejected(dir, 'region feature halo must not have normal');
  });

  it('rejects hints on unknown values', async () => {
    const dir = await packsWith(({ profile }) => {
      profile.features.margin.hintsEn.JAGGED = 'saw-like edge';
    });
    await expectRejected(dir, 'margin.hintsEn has unknown value JAGGED');
  });

  it('rejects features the whole-image region needs', async () => {
    const noShape = await packsWith(({ profile }) => {
      profile.features.lesionShape.values =
        profile.features.lesionShape.values.filter(
          (v: string) => v !== 'NO_DISTINCT_LESION',
        );
    });
    await expectRejected(noShape, 'lesionShape has no NO_DISTINCT_LESION');

    const noDistribution = await packsWith(({ profile }) => {
      delete profile.features.distribution;
      for (const entry of Object.values<any>(profile.profiles)) {
        delete entry.base?.distribution;
        for (const variant of Object.values<any>(entry.variants ?? {})) {
          delete variant.distribution;
        }
      }
    });
    await expectRejected(
      noDistribution,
      'region feature distribution is missing',
    );
  });

  it('rejects weights on unknown features, values or variants', async () => {
    const unknownFeature = await packsWith(({ profile }) => {
      profile.profiles.RICE_BLAST.base.fruit = { HUSK_ROT: 1 };
    });
    await expectRejected(unknownFeature, 'unknown feature fruit');

    const unknownValue = await packsWith(({ profile }) => {
      profile.profiles.RICE_BLAST.base.halo = { PURPLE: 1 };
    });
    await expectRejected(unknownValue, 'unknown value halo.PURPLE');

    const unknownVariant = await packsWith(({ profile }) => {
      profile.profiles.RICE_BLAST.variants.RICE_BLAST__V9 = {};
    });
    await expectRejected(unknownVariant, 'no variant RICE_BLAST__V9');
  });

  it('rejects plant parts and crop stages the crop does not list', async () => {
    const part = await packsWith(({ crop }) => {
      crop.plantParts = crop.plantParts.filter(
        (p: { code: string }) => p.code !== 'ROOT',
      );
    });
    await expectRejected(part, 'affects ROOT, not a plant part of the crop');

    const stage = await packsWith(({ crop }) => {
      crop.cropStages = crop.cropStages.filter(
        (s: { code: string }) => s.code !== 'TILLERING',
      );
    });
    await expectRejected(
      stage,
      'uses crop stage TILLERING, not a stage of the crop',
    );
  });

  it('rejects plant parts outside the shared enum', async () => {
    const dir = await packsWith(({ crop }) => {
      crop.plantParts.push({ code: 'TENDRIL', nameVi: 'Tua', promptEn: 'x' });
    });
    await expect(new JsonKnowledgeBaseSource(dir).load()).rejects.toThrow();
  });
});
