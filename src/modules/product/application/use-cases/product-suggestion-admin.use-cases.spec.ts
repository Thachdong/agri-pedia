import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  InvalidSuggestionSettingsException,
  ProductAdminRequiredException,
  ProductSuggestionMiss,
  TProductSuggestionMissProps,
} from '../../domain';
import {
  InMemoryProductSuggestionMissRepository,
  InMemoryProductSuggestionSettingsRepository,
} from '../ports/fakes';
import { GetProductSuggestionSettingsUseCase } from './get-product-suggestion-settings.use-case';
import { ListProductSuggestionMissesUseCase } from './list-product-suggestion-misses.use-case';
import { UpdateProductSuggestionSettingsUseCase } from './update-product-suggestion-settings.use-case';

const miss = (
  id: string,
  props: Omit<TProductSuggestionMissProps, 'createdAt'> & { at: string },
) =>
  ProductSuggestionMiss.restore(id, {
    userId: props.userId,
    detectedName: props.detectedName,
    normalizedName: props.normalizedName,
    createdAt: new Date(props.at),
  });

describe('product suggestion admin use cases', () => {
  let settings: InMemoryProductSuggestionSettingsRepository;
  let misses: InMemoryProductSuggestionMissRepository;
  let caller: TUserRoleSummary | null;
  let getSettings: GetProductSuggestionSettingsUseCase;
  let updateSettings: UpdateProductSuggestionSettingsUseCase;
  let listMisses: ListProductSuggestionMissesUseCase;

  beforeEach(() => {
    settings = new InMemoryProductSuggestionSettingsRepository();
    misses = new InMemoryProductSuggestionMissRepository();
    caller = { userId: 'admin', role: 'ADMIN', isActive: true };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => caller,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    getSettings = new GetProductSuggestionSettingsUseCase(settings, userQuery);
    updateSettings = new UpdateProductSuggestionSettingsUseCase(
      settings,
      userQuery,
      new InMemoryUnitOfWork(),
    );
    listMisses = new ListProductSuggestionMissesUseCase(misses, userQuery);
  });

  it('GetProductSuggestionSettings returns the defaults until saved', async () => {
    expect(await getSettings.execute({ userId: 'admin' })).toEqual({
      invalidImageLimit: 50,
      notFoundLimit: 50,
    });
  });

  it('UpdateProductSuggestionSettings saves both limits', async () => {
    const result = await updateSettings.execute({
      userId: 'admin',
      invalidImageLimit: 30,
      notFoundLimit: 0,
    });

    expect(result).toEqual({ invalidImageLimit: 30, notFoundLimit: 0 });
    expect(settings.saved).toEqual({ invalidImageLimit: 30, notFoundLimit: 0 });
  });

  it('UpdateProductSuggestionSettings rejects an out-of-range limit', async () => {
    await expect(
      updateSettings.execute({
        userId: 'admin',
        invalidImageLimit: 0,
        notFoundLimit: 10,
      }),
    ).rejects.toThrow(InvalidSuggestionSettingsException);
    expect(settings.saved).toBeNull();
  });

  it('ListProductSuggestionMisses groups by normalized name, most misses first', async () => {
    misses.items.push(
      miss('1', {
        userId: 'u1',
        detectedName: 'Thuoc A',
        normalizedName: 'thuoc a',
        at: '2026-10-01T00:00:00Z',
      }),
      miss('2', {
        userId: 'u2',
        detectedName: 'Thuốc A',
        normalizedName: 'thuoc a',
        at: '2026-10-03T00:00:00Z',
      }),
      miss('3', {
        userId: 'u1',
        detectedName: 'THUOC A',
        normalizedName: 'thuoc a',
        at: '2026-10-02T00:00:00Z',
      }),
      miss('4', {
        userId: 'u3',
        detectedName: 'Thuốc B',
        normalizedName: 'thuoc b',
        at: '2026-10-05T00:00:00Z',
      }),
    );

    const result = await listMisses.execute({
      userId: 'admin',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      items: [
        {
          normalizedName: 'thuoc a',
          latestDetectedName: 'Thuốc A',
          count: 3,
          distributorCount: 2,
          lastSeenAt: new Date('2026-10-03T00:00:00Z'),
        },
        {
          normalizedName: 'thuoc b',
          latestDetectedName: 'Thuốc B',
          count: 1,
          distributorCount: 1,
          lastSeenAt: new Date('2026-10-05T00:00:00Z'),
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
  });

  it.each([
    ['a distributor', { userId: 'u1', role: 'DISTRIBUTOR', isActive: true }],
    ['an unknown user', null],
  ] as [string, TUserRoleSummary | null][])(
    'rejects %s',
    async (_case, user) => {
      caller = user;

      await expect(getSettings.execute({ userId: 'x' })).rejects.toThrow(
        ProductAdminRequiredException,
      );
      await expect(
        updateSettings.execute({
          userId: 'x',
          invalidImageLimit: 1,
          notFoundLimit: 1,
        }),
      ).rejects.toThrow(ProductAdminRequiredException);
      await expect(
        listMisses.execute({ userId: 'x', page: 1, limit: 20 }),
      ).rejects.toThrow(ProductAdminRequiredException);
    },
  );
});
