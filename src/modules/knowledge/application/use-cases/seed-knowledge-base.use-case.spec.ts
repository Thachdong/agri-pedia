import { IConfigService } from '@shared/config';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  buildCrop,
  buildDisease,
  InMemoryKnowledgeBaseSource,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { SeedKnowledgeBaseUseCase } from './seed-knowledge-base.use-case';

function configWith(enabledCrops: string[] = []): IConfigService {
  return { get: () => ({ enabledCrops }) } as unknown as IConfigService;
}

function seed(
  source: InMemoryKnowledgeBaseSource,
  knowledge = new InMemoryKnowledgeRepository(),
  enabledCrops: string[] = [],
): SeedKnowledgeBaseUseCase {
  return new SeedKnowledgeBaseUseCase(
    source,
    knowledge,
    configWith(enabledCrops),
    new InMemoryUnitOfWork(),
  );
}

describe('SeedKnowledgeBaseUseCase', () => {
  it('upserts crops and diseases and deletes entries removed from the KB', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.diseases.set('RICE_OLD', buildDisease({ code: 'RICE_OLD' }));
    const blast = buildDisease({ code: 'RICE_BLAST', nameVi: 'Đạo ôn mới' });
    const source = new InMemoryKnowledgeBaseSource({
      crops: [buildCrop()],
      diseases: [blast],
    });
    const useCase = seed(source, knowledge);

    expect(await useCase.execute()).toEqual({
      crops: [{ code: 'RICE', kbVersion: '2026-10-12', enabled: true }],
      diseaseCount: 1,
    });
    expect([...knowledge.diseases.keys()]).toEqual(['RICE_BLAST']);
    expect(knowledge.crops.get('RICE')?.enabled).toBe(true);

    // idempotent
    await useCase.execute();
    expect([...knowledge.diseases.keys()]).toEqual(['RICE_BLAST']);
  });

  it('seeds several crops, each with its own kbVersion and enabled flag', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    const source = new InMemoryKnowledgeBaseSource({
      crops: [
        buildCrop('RICE'),
        buildCrop('DURIAN', false, { kbVersion: '2026-10-15' }),
      ],
      diseases: [
        buildDisease(),
        buildDisease({ code: 'DURIAN_ANTHRACNOSE', cropType: 'DURIAN' }),
      ],
    });

    expect(await seed(source, knowledge).execute()).toEqual({
      crops: [
        { code: 'RICE', kbVersion: '2026-10-12', enabled: true },
        { code: 'DURIAN', kbVersion: '2026-10-15', enabled: false },
      ],
      diseaseCount: 2,
    });
    expect(knowledge.crops.get('DURIAN')?.enabled).toBe(false);
    expect(knowledge.diseases.has('DURIAN_ANTHRACNOSE')).toBe(true);
  });

  it('enables the crops listed in knowledge.enabledCrops', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    const source = new InMemoryKnowledgeBaseSource({
      crops: [buildCrop('RICE'), buildCrop('DURIAN', false)],
      diseases: [],
    });

    await seed(source, knowledge, ['DURIAN']).execute();

    expect(knowledge.crops.get('DURIAN')?.enabled).toBe(true);
    expect(knowledge.crops.get('RICE')?.enabled).toBe(true);
  });

  it('fails when knowledge.enabledCrops lists a crop that is not seeded', async () => {
    const source = new InMemoryKnowledgeBaseSource({
      crops: [buildCrop('RICE')],
      diseases: [],
    });

    await expect(seed(source, undefined, ['CORN']).execute()).rejects.toThrow(
      'CORN',
    );
  });

  it('disables crops that are no longer seeded and keeps their diseases', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('CORN', buildCrop('CORN'));
    knowledge.diseases.set(
      'CORN_RUST',
      buildDisease({ code: 'CORN_RUST', cropType: 'CORN' }),
    );
    const source = new InMemoryKnowledgeBaseSource({
      crops: [buildCrop('RICE')],
      diseases: [],
    });

    await seed(source, knowledge).execute();

    expect(knowledge.crops.get('CORN')?.enabled).toBe(false);
    expect(knowledge.diseases.has('CORN_RUST')).toBe(true);
  });

  it('fails when the source is inconsistent', async () => {
    const source = new InMemoryKnowledgeBaseSource({ crops: [], diseases: [] });
    source.load = async () => {
      throw new Error('profile kbVersion mismatch');
    };

    await expect(seed(source).execute()).rejects.toThrow('mismatch');
  });
});
