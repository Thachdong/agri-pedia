import { IMediaQueryPort, TMediaThumbnail } from '@modules/media/contracts';
import { IUserQueryPort, TUserProfileSummary } from '@modules/user/contracts';
import {
  EProductStatus,
  EProductUnit,
  InvalidProductCursorException,
  Product,
  ProductDistributorNotFoundException,
} from '../../domain';
import { InMemoryProductRepository } from '../ports/fakes';
import { ListDistributorProductsUseCase } from './list-distributor-products.use-case';

const SELLER = '11111111-1111-4111-8111-111111111111';

/** Product of `userId` created `minutesAgo` minutes ago. */
const productOf = (
  userId: string,
  minutesAgo: number,
  props: { status?: EProductStatus; deleted?: boolean } = {},
): Product =>
  Product.restore(crypto.randomUUID(), {
    userId,
    name: `P-${minutesAgo}`,
    description: 'd',
    price: 1000 + minutesAgo,
    quantity: 5,
    unit: EProductUnit.KG,
    categoryId: 'c1',
    status: props.status ?? EProductStatus.ACTIVE,
    createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000),
    deletedAt: props.deleted ? new Date() : null,
  });

describe('ListDistributorProductsUseCase', () => {
  let products: InMemoryProductRepository;
  let profile: TUserProfileSummary | null;
  let thumbnails: TMediaThumbnail[];
  let thumbnailRequests: string[][];
  let useCase: ListDistributorProductsUseCase;

  const save = async (...items: Product[]) => {
    for (const item of items) {
      await products.save(item);
    }
  };

  beforeEach(() => {
    products = new InMemoryProductRepository();
    profile = { userId: SELLER, username: 'Seed Shop', role: 'DISTRIBUTOR' };
    thumbnails = [];
    thumbnailRequests = [];
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => null,
      findProfileById: async () => profile,
      listProfilesByIds: async () => [],
    };
    const mediaQuery: IMediaQueryPort = {
      listByOwner: async () => [],
      findUrls: async () => [],
      findThumbnails: async (_, ownerIds) => {
        thumbnailRequests.push(ownerIds);
        return thumbnails.filter((t) => ownerIds.includes(t.ownerId));
      },
    };
    useCase = new ListDistributorProductsUseCase(
      products,
      userQuery,
      mediaQuery,
    );
  });

  it('lists ACTIVE, not deleted products of the distributor, newest first', async () => {
    const newest = productOf(SELLER, 1);
    const older = productOf(SELLER, 5);
    await save(
      older,
      newest,
      productOf(SELLER, 2, { status: EProductStatus.INACTIVE }),
      productOf(SELLER, 3, { status: EProductStatus.OUT_OF_STOCK }),
      productOf(SELLER, 4, { deleted: true }),
      productOf('22222222-2222-4222-8222-222222222222', 0),
    );
    thumbnails = [{ ownerId: newest.id, url: 'https://img/newest' }];

    const result = await useCase.execute({ distributorId: SELLER, limit: 20 });

    expect(result).toEqual({
      products: [
        {
          id: newest.id,
          name: 'P-1',
          price: 1001,
          quantity: 5,
          unit: EProductUnit.KG,
          thumbnail: 'https://img/newest',
          distributorId: SELLER,
          distributorName: 'Seed Shop',
        },
        expect.objectContaining({ id: older.id, thumbnail: null }),
      ],
      nextCursor: null,
    });
    expect(thumbnailRequests).toEqual([[newest.id, older.id]]);
  });

  it('pages with nextCursor until the last page', async () => {
    const items = [1, 2, 3, 4, 5].map((m) => productOf(SELLER, m));
    await save(...items);

    const first = await useCase.execute({ distributorId: SELLER, limit: 2 });
    const second = await useCase.execute({
      distributorId: SELLER,
      limit: 2,
      cursor: first.nextCursor!,
    });
    const third = await useCase.execute({
      distributorId: SELLER,
      limit: 2,
      cursor: second.nextCursor!,
    });

    const ids = (page: { products: { id: string }[] }) =>
      page.products.map((p) => p.id);
    expect(ids(first)).toEqual([items[0].id, items[1].id]);
    expect(ids(second)).toEqual([items[2].id, items[3].id]);
    expect(ids(third)).toEqual([items[4].id]);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(third.nextCursor).toBeNull();
  });

  it('returns no nextCursor when the page is exactly full', async () => {
    await save(productOf(SELLER, 1), productOf(SELLER, 2));

    const result = await useCase.execute({ distributorId: SELLER, limit: 2 });

    expect(result.products).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('returns an empty page for a distributor without products', async () => {
    await expect(
      useCase.execute({ distributorId: SELLER, limit: 20 }),
    ).resolves.toEqual({ products: [], nextCursor: null });
  });

  it.each<[string, TUserProfileSummary | null]>([
    ['unknown user', null],
    ['farmer', { userId: SELLER, username: 'Farmer', role: 'FARMER' }],
  ])('rejects %s', async (_, summary) => {
    profile = summary;

    await expect(
      useCase.execute({ distributorId: SELLER, limit: 20 }),
    ).rejects.toThrow(ProductDistributorNotFoundException);
  });

  it.each([
    ['not base64 JSON', 'not-a-cursor'],
    [
      'bad date',
      Buffer.from(
        JSON.stringify({ c: 'x', i: '11111111-1111-4111-8111-111111111111' }),
      ).toString('base64url'),
    ],
    [
      'id not a uuid',
      Buffer.from(
        JSON.stringify({ c: '2026-01-01T00:00:00.000Z', i: 'abc' }),
      ).toString('base64url'),
    ],
  ])('rejects a cursor that is %s', async (_, cursor) => {
    await expect(
      useCase.execute({ distributorId: SELLER, limit: 20, cursor }),
    ).rejects.toThrow(InvalidProductCursorException);
  });
});
