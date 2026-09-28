import { Province } from './province.entity';

describe('Province', () => {
  it('restores codename and name', () => {
    const province = Province.restore({
      codename: 'ha_noi',
      name: 'Thành phố Hà Nội',
    });

    expect(province.codename).toBe('ha_noi');
    expect(province.name).toBe('Thành phố Hà Nội');
  });
});
