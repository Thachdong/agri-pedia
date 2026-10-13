import { buildCrop, buildDisease } from '../../application/ports/fakes';
import { KnowledgeMapper } from './knowledge.mapper';

describe('KnowledgeMapper', () => {
  it('round-trips a crop', () => {
    const crop = buildCrop();
    const restored = KnowledgeMapper.cropToDomain(
      KnowledgeMapper.cropToOrm(crop),
    );
    expect(restored).toEqual(crop);
  });

  it('round-trips a disease', () => {
    const disease = buildDisease({
      scientificName: 'Pyricularia oryzae',
      aliasesVi: ['Cháy lá'],
      profile: { base: { halo: { YELLOW: -1 } } },
      content: { visualKeywords: ['spindle shape'] },
    });
    const restored = KnowledgeMapper.diseaseToDomain(
      KnowledgeMapper.diseaseToOrm(disease),
    );
    expect(restored).toEqual(disease);
  });
});
