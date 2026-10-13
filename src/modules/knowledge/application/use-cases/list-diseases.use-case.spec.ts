import { EDiseaseCategory, KnowledgeCropNotFoundException } from '../../domain';
import {
  buildCrop,
  buildDisease,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { ListDiseasesUseCase } from './list-diseases.use-case';

describe('ListDiseasesUseCase', () => {
  let knowledge: InMemoryKnowledgeRepository;
  let useCase: ListDiseasesUseCase;

  beforeEach(() => {
    knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop());
    for (const disease of [
      buildDisease({
        code: 'RICE_LEAFFOLDER',
        nameVi: 'Sâu cuốn lá',
        nameEn: 'Leaffolder',
        category: EDiseaseCategory.PEST,
      }),
      buildDisease({
        code: 'RICE_BLAST',
        nameVi: 'Bệnh đạo ôn',
        nameEn: 'Rice Blast',
        aliasesVi: ['Cháy lá'],
        aliasesEn: ['Leaf blast'],
      }),
      buildDisease({ code: 'CORN_RUST', cropType: 'CORN', nameVi: 'Gỉ sắt' }),
    ]) {
      knowledge.diseases.set(disease.code, disease);
    }
    useCase = new ListDiseasesUseCase(knowledge);
  });

  it('lists diseases of the crop by Vietnamese name', async () => {
    const { diseases } = await useCase.execute({ crop: 'RICE' });

    expect(diseases.map((d) => d.code)).toEqual([
      'RICE_BLAST',
      'RICE_LEAFFOLDER',
    ]);
    expect(diseases[0]).toEqual({
      code: 'RICE_BLAST',
      nameVi: 'Bệnh đạo ôn',
      nameEn: 'Rice Blast',
      scientificName: null,
      aliases: ['Cháy lá', 'Leaf blast'],
      category: 'DISEASE',
      agentType: 'FUNGUS',
      affectedParts: ['LEAF'],
      verification: 'SOURCED',
    });
  });

  it('filters by category and accent-insensitive query', async () => {
    expect(
      (
        await useCase.execute({ crop: 'RICE', category: EDiseaseCategory.PEST })
      ).diseases.map((d) => d.code),
    ).toEqual(['RICE_LEAFFOLDER']);
    expect(
      (await useCase.execute({ crop: 'RICE', q: 'chay la' })).diseases.map(
        (d) => d.code,
      ),
    ).toEqual(['RICE_BLAST']);
  });

  it('throws KnowledgeCropNotFound for an unknown crop', async () => {
    await expect(useCase.execute({ crop: 'WHEAT' })).rejects.toBeInstanceOf(
      KnowledgeCropNotFoundException,
    );
  });
});
