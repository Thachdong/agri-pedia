import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import {
  CatalogItem,
  EProductSuggestionStatus,
  ProductSellerNotAllowedException,
  SuggestionImageInvalidException,
  SuggestionQuotaExceededException,
} from '../../domain';
import {
  FakeProductNameReader,
  InMemoryCatalogRepository,
  InMemoryProductSuggestionMissRepository,
  InMemoryProductSuggestionSettingsRepository,
  InMemoryProductSuggestionUsageRepository,
} from '../ports/fakes';
import { ProductPhotoUnreadableError } from '../ports/product-name-reader';
import {
  SUGGESTION_PHOTO_MAX_BYTES,
  SuggestProductUseCase,
  TSuggestProductInput,
} from './suggest-product.use-case';

const input: TSuggestProductInput = {
  userId: 'u1',
  photo: { data: Buffer.from('photo'), mimeType: 'image/jpeg' },
};

describe('SuggestProductUseCase', () => {
  let reader: FakeProductNameReader;
  let catalog: InMemoryCatalogRepository;
  let settings: InMemoryProductSuggestionSettingsRepository;
  let usages: InMemoryProductSuggestionUsageRepository;
  let misses: InMemoryProductSuggestionMissRepository;
  let seller: TUserRoleSummary | null;
  let logger: InMemoryLogger;
  let useCase: SuggestProductUseCase;

  beforeEach(() => {
    reader = new FakeProductNameReader();
    catalog = new InMemoryCatalogRepository();
    catalog.add(
      CatalogItem.create({
        name: 'Anvil 5SC',
        description: 'Hexaconazole 50 g/l, trị lem lép hạt, khô vằn',
      }),
    );
    settings = new InMemoryProductSuggestionSettingsRepository();
    settings.saved = { invalidImageLimit: 3, notFoundLimit: 1 };
    usages = new InMemoryProductSuggestionUsageRepository();
    misses = new InMemoryProductSuggestionMissRepository();
    seller = { userId: 'u1', role: 'DISTRIBUTOR', isActive: true };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => seller,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    logger = new InMemoryLogger();
    useCase = new SuggestProductUseCase(
      reader,
      catalog,
      settings,
      usages,
      misses,
      userQuery,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  const usage = () => usages.items.get('u1');

  it('FOUND: suggests the matching catalog item and charges the visible quota', async () => {
    reader.name = '  ANVIL 5SC® ';

    const result = await useCase.execute(input);

    expect(result).toEqual({
      status: EProductSuggestionStatus.FOUND,
      suggestion: {
        name: 'Anvil 5SC',
        description: 'Hexaconazole 50 g/l, trị lem lép hạt, khô vằn',
      },
      remaining: 2,
    });
    expect(reader.photos).toEqual([input.photo]);
    expect(usage()).toEqual({ userId: 'u1', used: 1, bonusUsed: 0 });
    expect(misses.items).toHaveLength(0);
  });

  it.each([
    ['no name', null],
    ['a name without letters or digits', ' ®™ '],
  ])(
    'UNREADABLE when the reader finds %s; charges the visible quota',
    async (_case, name) => {
      reader.name = name;

      const result = await useCase.execute(input);

      expect(result).toEqual({
        status: EProductSuggestionStatus.UNREADABLE,
        remaining: 2,
      });
      expect(usage()).toEqual({ userId: 'u1', used: 1, bonusUsed: 0 });
    },
  );

  it('NOT_FOUND: logs the miss and charges the bonus while it has room, then the visible quota', async () => {
    reader.name = ' Thuốc Lạ 10WP ';

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(first).toEqual({
      status: EProductSuggestionStatus.NOT_FOUND,
      detectedName: 'Thuốc Lạ 10WP',
      remaining: 3,
    });
    expect(second).toEqual({
      status: EProductSuggestionStatus.NOT_FOUND,
      detectedName: 'Thuốc Lạ 10WP',
      remaining: 2,
    });
    expect(usage()).toEqual({ userId: 'u1', used: 1, bonusUsed: 1 });
    expect(
      misses.items.map((miss) => ({
        userId: miss.userId,
        detectedName: miss.detectedName,
        normalizedName: miss.normalizedName,
      })),
    ).toEqual([
      {
        userId: 'u1',
        detectedName: 'Thuốc Lạ 10WP',
        normalizedName: 'thuoc la 10wp',
      },
      {
        userId: 'u1',
        detectedName: 'Thuốc Lạ 10WP',
        normalizedName: 'thuoc la 10wp',
      },
    ]);
  });

  it('throws SuggestionQuotaExceeded before reading when the visible quota is used up', async () => {
    usages.items.set('u1', { userId: 'u1', used: 3, bonusUsed: 0 });

    await expect(useCase.execute(input)).rejects.toThrow(
      SuggestionQuotaExceededException,
    );
    expect(reader.photos).toHaveLength(0);
    expect(usage()).toEqual({ userId: 'u1', used: 3, bonusUsed: 0 });
  });

  it('refunds and rethrows when the reading service fails', async () => {
    const failure = new Error('provider down');
    reader.error = failure;

    await expect(useCase.execute(input)).rejects.toBe(failure);
    expect(usage()).toEqual({ userId: 'u1', used: 0, bonusUsed: 0 });
    expect(logger.entries).toEqual([
      expect.objectContaining({ level: 'error', error: failure }),
    ]);
  });

  it('refunds and throws SuggestionImageInvalid when the photo cannot be decoded', async () => {
    reader.error = new ProductPhotoUnreadableError('not an image');

    await expect(useCase.execute(input)).rejects.toThrow(
      SuggestionImageInvalidException,
    );
    expect(usage()).toEqual({ userId: 'u1', used: 0, bonusUsed: 0 });
  });

  it.each([
    ['an unsupported type', { data: Buffer.from('x'), mimeType: 'image/gif' }],
    ['an empty file', { data: Buffer.alloc(0), mimeType: 'image/png' }],
    [
      'a file over 5MB',
      {
        data: Buffer.alloc(SUGGESTION_PHOTO_MAX_BYTES + 1),
        mimeType: 'image/webp',
      },
    ],
  ])('rejects %s without charging', async (_case, photo) => {
    await expect(useCase.execute({ userId: 'u1', photo })).rejects.toThrow(
      SuggestionImageInvalidException,
    );
    expect(reader.photos).toHaveLength(0);
    expect(usage()).toBeUndefined();
  });

  it.each([
    ['a farmer', { userId: 'u1', role: 'FARMER', isActive: true }],
    [
      'an inactive distributor',
      { userId: 'u1', role: 'DISTRIBUTOR', isActive: false },
    ],
    ['an unknown user', null],
  ] as [string, TUserRoleSummary | null][])(
    'rejects %s',
    async (_case, user) => {
      seller = user;

      await expect(useCase.execute(input)).rejects.toThrow(
        ProductSellerNotAllowedException,
      );
      expect(reader.photos).toHaveLength(0);
    },
  );
});
