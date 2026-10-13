import { InMemoryUnitOfWork } from '@shared/database';
import {
  buildCrop,
  buildDisease,
  InMemoryKnowledgeBaseSource,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { SeedKnowledgeBaseUseCase } from './seed-knowledge-base.use-case';

describe('SeedKnowledgeBaseUseCase', () => {
  it('upserts crops and diseases and deletes entries removed from the KB', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.diseases.set('RICE_OLD', buildDisease({ code: 'RICE_OLD' }));
    const blast = buildDisease({ code: 'RICE_BLAST', nameVi: 'Đạo ôn mới' });
    const source = new InMemoryKnowledgeBaseSource({
      kbVersion: '2026-10-12',
      crops: [buildCrop()],
      diseases: [blast],
    });
    const useCase = new SeedKnowledgeBaseUseCase(
      source,
      knowledge,
      new InMemoryUnitOfWork(),
    );

    expect(await useCase.execute()).toEqual({
      kbVersion: '2026-10-12',
      cropCount: 1,
      diseaseCount: 1,
    });
    expect([...knowledge.diseases.keys()]).toEqual(['RICE_BLAST']);
    expect(knowledge.crops.get('RICE')?.enabled).toBe(true);

    // idempotent
    await useCase.execute();
    expect([...knowledge.diseases.keys()]).toEqual(['RICE_BLAST']);
  });

  it('fails when the source is inconsistent', async () => {
    const source = new InMemoryKnowledgeBaseSource({
      kbVersion: 'x',
      crops: [],
      diseases: [],
    });
    source.load = async () => {
      throw new Error('profile kbVersion mismatch');
    };
    const useCase = new SeedKnowledgeBaseUseCase(
      source,
      new InMemoryKnowledgeRepository(),
      new InMemoryUnitOfWork(),
    );

    await expect(useCase.execute()).rejects.toThrow('mismatch');
  });
});
