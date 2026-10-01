import { Ward } from './ward.entity';

describe('Ward', () => {
  it('restores codename, name and its province', () => {
    const ward = Ward.restore({
      codename: 'phuong_ba_dinh',
      name: 'Phường Ba Đình',
      provinceCodename: 'ha_noi',
    });

    expect(ward.codename).toBe('phuong_ba_dinh');
    expect(ward.name).toBe('Phường Ba Đình');
    expect(ward.provinceCodename).toBe('ha_noi');
  });
});
