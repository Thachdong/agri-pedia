import {
  LocationProvinceNotFoundException,
  Province,
  Ward,
} from '../../domain';
import { InMemoryLocationRepository } from '../ports/fakes';
import { ListWardsByProvinceUseCase } from './list-wards-by-province.use-case';

describe('ListWardsByProvinceUseCase', () => {
  let locations: InMemoryLocationRepository;
  let useCase: ListWardsByProvinceUseCase;

  beforeEach(() => {
    locations = new InMemoryLocationRepository();
    locations.provinces.push(
      Province.restore({ codename: 'ha_noi', name: 'Thành phố Hà Nội' }),
      Province.restore({ codename: 'can_tho', name: 'Thành phố Cần Thơ' }),
    );
    locations.wards.push(
      Ward.restore({
        codename: 'phuong_ba_dinh',
        name: 'Phường Ba Đình',
        provinceCodename: 'ha_noi',
      }),
      Ward.restore({
        codename: 'phuong_ninh_kieu',
        name: 'Phường Ninh Kiều',
        provinceCodename: 'can_tho',
      }),
      Ward.restore({
        codename: 'phuong_ngoc_ha',
        name: 'Phường Ngọc Hà',
        provinceCodename: 'ha_noi',
      }),
    );
    useCase = new ListWardsByProvinceUseCase(locations);
  });

  it('returns only the wards of the province, in master data order', async () => {
    expect(await useCase.execute({ provinceCode: 'ha_noi' })).toEqual({
      wards: [
        { codename: 'phuong_ba_dinh', name: 'Phường Ba Đình' },
        { codename: 'phuong_ngoc_ha', name: 'Phường Ngọc Hà' },
      ],
    });
  });

  it('rejects an unknown province', async () => {
    await expect(useCase.execute({ provinceCode: 'khong_co' })).rejects.toThrow(
      LocationProvinceNotFoundException,
    );
  });
});
