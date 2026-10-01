import { LocationMapper } from './location.mapper';
import { ProvinceOrmEntity } from './province.orm-entity';
import { WardOrmEntity } from './ward.orm-entity';

describe('LocationMapper', () => {
  it('maps a province row', () => {
    const row = Object.assign(new ProvinceOrmEntity(), {
      codename: 'ha_noi',
      name: 'Thành phố Hà Nội',
      sortOrder: 0,
    });

    const province = LocationMapper.provinceToDomain(row);

    expect(province.codename).toBe('ha_noi');
    expect(province.name).toBe('Thành phố Hà Nội');
  });

  it('maps a ward row', () => {
    const row = Object.assign(new WardOrmEntity(), {
      provinceCodename: 'ha_noi',
      codename: 'phuong_ba_dinh',
      name: 'Phường Ba Đình',
      sortOrder: 0,
    });

    const ward = LocationMapper.wardToDomain(row);

    expect(ward.codename).toBe('phuong_ba_dinh');
    expect(ward.name).toBe('Phường Ba Đình');
    expect(ward.provinceCodename).toBe('ha_noi');
  });
});
