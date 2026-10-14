import { EPlantPart } from '../../domain';
import { buildCrop, InMemoryKnowledgeRepository } from '../ports/fakes';
import { ListCropsUseCase } from './list-crops.use-case';

describe('ListCropsUseCase', () => {
  it('returns enabled crops by sortOrder with their plant parts and crop stages', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set(
      'DURIAN',
      buildCrop('DURIAN', true, {
        nameVi: 'Sầu riêng',
        sortOrder: 2,
        plantParts: [
          { code: EPlantPart.FRUIT, nameVi: 'Trái', promptEn: 'fruit' },
        ],
        cropStages: [],
      }),
    );
    knowledge.crops.set('RICE', buildCrop('RICE', true, { sortOrder: 1 }));
    knowledge.crops.set('CORN', buildCrop('CORN', false));

    expect(await new ListCropsUseCase(knowledge).execute()).toEqual({
      crops: [
        {
          code: 'RICE',
          nameVi: 'Lúa',
          plantParts: [{ code: 'LEAF', nameVi: 'Lá' }],
          cropStages: [{ code: 'SEEDLING', nameVi: 'Mạ' }],
        },
        {
          code: 'DURIAN',
          nameVi: 'Sầu riêng',
          plantParts: [{ code: 'FRUIT', nameVi: 'Trái' }],
          cropStages: [],
        },
      ],
    });
  });
});
