import { buildCrop, InMemoryKnowledgeRepository } from '../ports/fakes';
import { ListCropsUseCase } from './list-crops.use-case';

describe('ListCropsUseCase', () => {
  it('returns enabled crops only', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop('RICE'));
    knowledge.crops.set('CORN', buildCrop('CORN', false));

    expect(await new ListCropsUseCase(knowledge).execute()).toEqual({
      crops: [{ code: 'RICE', nameVi: 'Lúa' }],
    });
  });
});
