import { Crop } from './crop.entity';

describe('Crop', () => {
  it('restores from persistence', () => {
    const crop = Crop.restore({ code: 'RICE', nameVi: 'Lúa', enabled: true });

    expect(crop.code).toBe('RICE');
    expect(crop.nameVi).toBe('Lúa');
    expect(crop.enabled).toBe(true);
  });
});
