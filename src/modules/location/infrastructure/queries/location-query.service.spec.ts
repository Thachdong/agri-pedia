import { InMemoryLocationRepository } from '../../application/ports/fakes';
import { Province, Ward } from '../../domain';
import { LocationQueryService } from './location-query.service';

describe('LocationQueryService.wardBelongsToProvince', () => {
  let service: LocationQueryService;

  beforeEach(() => {
    const locations = new InMemoryLocationRepository();
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
    );
    service = new LocationQueryService(locations);
  });

  it('accepts a ward of the province', async () => {
    await expect(
      service.wardBelongsToProvince('ha_noi', 'phuong_ba_dinh'),
    ).resolves.toBe(true);
  });

  it.each([
    ['can_tho', 'phuong_ba_dinh'],
    ['ha_noi', 'phuong_unknown'],
    ['unknown', 'phuong_ba_dinh'],
  ])('rejects (%p, %p)', async (provinceCode, wardCode) => {
    await expect(
      service.wardBelongsToProvince(provinceCode, wardCode),
    ).resolves.toBe(false);
  });
});

describe('LocationQueryService.provinceExists', () => {
  it('knows seeded provinces only', async () => {
    const locations = new InMemoryLocationRepository();
    locations.provinces.push(
      Province.restore({ codename: 'ha_noi', name: 'Thành phố Hà Nội' }),
    );
    const service = new LocationQueryService(locations);

    await expect(service.provinceExists('ha_noi')).resolves.toBe(true);
    await expect(service.provinceExists('unknown')).resolves.toBe(false);
  });
});
