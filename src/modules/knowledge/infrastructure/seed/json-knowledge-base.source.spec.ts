import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EPlantPart, scoreCandidates } from '../../domain';
import { JsonKnowledgeBaseSource } from './json-knowledge-base.source';

async function copyWith(
  edit: (files: { diseases: any; profile: any }) => void,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'kb-'));
  const files = {
    diseases: JSON.parse(
      await readFile(join(__dirname, 'diseases.json'), 'utf8'),
    ),
    profile: JSON.parse(
      await readFile(join(__dirname, 'profile.json'), 'utf8'),
    ),
  };
  edit(files);
  await writeFile(join(dir, 'diseases.json'), JSON.stringify(files.diseases));
  await writeFile(join(dir, 'profile.json'), JSON.stringify(files.profile));
  return dir;
}

describe('JsonKnowledgeBaseSource (shipped seed files)', () => {
  it('loads every KB entry with its profile and the RICE crop', async () => {
    const snapshot = await new JsonKnowledgeBaseSource().load();

    expect(snapshot.kbVersion).toBe('2026-10-12');
    expect(snapshot.crops.map((c) => [c.code, c.nameVi, c.enabled])).toEqual([
      ['RICE', 'Lúa', true],
    ]);
    expect(snapshot.diseases).toHaveLength(51);
    const blast = snapshot.diseases.find((d) => d.code === 'RICE_BLAST');
    expect(blast?.nameVi).toBe('Bệnh đạo ôn');
    expect(blast?.content.variants.map((v) => v.code)).toEqual([
      'RICE_BLAST__V1',
      'RICE_BLAST__V2',
      'RICE_BLAST__V3',
    ]);
    expect(blast?.profile?.base).toBeDefined();
  });

  it('scores the spec examples as expected (leaf blast, bacterial blight)', async () => {
    const { diseases } = await new JsonKnowledgeBaseSource().load();
    const units = (part: EPlantPart) =>
      diseases
        .filter((d) => d.isCandidateFor(part))
        .flatMap((d) => d.scoringUnits());

    const blast = scoreCandidates(
      units(EPlantPart.LEAF),
      {
        lesionShape: 'SPINDLE_DIAMOND',
        centerColor: 'GRAY_WHITE',
        borderColor: 'DARK_BROWN',
        margin: 'SHARP',
        halo: 'NONE',
        size: 'MEDIUM_2_10MM',
        position: 'LEAF_BLADE',
      },
      3,
    );
    expect(blast[0]).toMatchObject({ variantCode: 'RICE_BLAST__V1', raw: 9 });
    expect(blast[0].matchScore).toBeGreaterThan(0.9);

    const blight = scoreCandidates(
      units(EPlantPart.LEAF),
      {
        lesionShape: 'LONG_STREAK',
        centerColor: 'YELLOW',
        margin: 'WAVY_IRREGULAR',
        size: 'LARGE_GT_10MM',
        position: 'LEAF_MARGIN',
      },
      3,
    );
    expect(blight[0]).toMatchObject({
      variantCode: 'RICE_BACTERIAL_BLIGHT__V1',
      raw: 12,
    });
  });
});

describe('JsonKnowledgeBaseSource (inconsistent files)', () => {
  it('rejects a profile built for another KB version', async () => {
    const dir = await copyWith(({ profile }) => {
      profile.kbVersion = '1999-01-01';
    });
    await expect(new JsonKnowledgeBaseSource(dir).load()).rejects.toThrow(
      'does not match',
    );
  });

  it('rejects features that differ from OBSERVATION_FEATURES', async () => {
    const dir = await copyWith(({ profile }) => {
      profile.features.halo.values.push('RED');
    });
    await expect(new JsonKnowledgeBaseSource(dir).load()).rejects.toThrow(
      'features differ',
    );
  });

  it('rejects weights on unknown values or variants', async () => {
    const unknownValue = await copyWith(({ profile }) => {
      profile.profiles.RICE_BLAST.base.halo = { PURPLE: 1 };
    });
    await expect(
      new JsonKnowledgeBaseSource(unknownValue).load(),
    ).rejects.toThrow('unknown value halo.PURPLE');

    const unknownVariant = await copyWith(({ profile }) => {
      profile.profiles.RICE_BLAST.variants.RICE_BLAST__V9 = {};
    });
    await expect(
      new JsonKnowledgeBaseSource(unknownVariant).load(),
    ).rejects.toThrow('no variant RICE_BLAST__V9');
  });
});
