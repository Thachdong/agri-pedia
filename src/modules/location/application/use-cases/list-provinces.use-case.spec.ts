import { Province } from '../../domain';
import { InMemoryLocationRepository } from '../ports/fakes';
import { ListProvincesUseCase } from './list-provinces.use-case';

describe('ListProvincesUseCase', () => {
  it('returns every province in master data order', async () => {
    const locations = new InMemoryLocationRepository();
    locations.provinces.push(
      Province.restore({ codename: 'ha_noi', name: 'Thành phố Hà Nội' }),
      Province.restore({ codename: 'an_giang', name: 'Tỉnh An Giang' }),
    );

    expect(await new ListProvincesUseCase(locations).execute()).toEqual({
      provinces: [
        { codename: 'ha_noi', name: 'Thành phố Hà Nội' },
        { codename: 'an_giang', name: 'Tỉnh An Giang' },
      ],
    });
  });

  it('returns an empty list when there is no data', async () => {
    expect(
      await new ListProvincesUseCase(
        new InMemoryLocationRepository(),
      ).execute(),
    ).toEqual({ provinces: [] });
  });
});
