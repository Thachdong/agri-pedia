import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  CatalogItem,
  CatalogItemNameTakenException,
  CatalogItemNotFoundException,
  InvalidCatalogItemException,
  ProductAdminRequiredException,
} from '../../domain';
import { InMemoryCatalogRepository } from '../ports/fakes';
import { CreateCatalogItemUseCase } from './create-catalog-item.use-case';
import { DeleteCatalogItemUseCase } from './delete-catalog-item.use-case';
import { ListCatalogItemsUseCase } from './list-catalog-items.use-case';
import { UpdateCatalogItemUseCase } from './update-catalog-item.use-case';

describe('catalog item use cases', () => {
  let catalog: InMemoryCatalogRepository;
  let caller: TUserRoleSummary | null;
  let anvil: CatalogItem;
  let list: ListCatalogItemsUseCase;
  let create: CreateCatalogItemUseCase;
  let update: UpdateCatalogItemUseCase;
  let remove: DeleteCatalogItemUseCase;

  beforeEach(() => {
    catalog = new InMemoryCatalogRepository();
    anvil = CatalogItem.create({
      name: 'Anvil 5SC',
      description: 'Hexaconazole',
    });
    catalog.add(
      anvil,
      CatalogItem.create({
        name: 'Tilt Super 300EC',
        description: 'Propiconazole',
      }),
      CatalogItem.create({ name: 'Đạm Phú Mỹ', description: 'Urê 46%' }),
    );
    caller = { userId: 'admin', role: 'ADMIN', isActive: true };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => caller,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    const unitOfWork = new InMemoryUnitOfWork();
    list = new ListCatalogItemsUseCase(catalog, userQuery);
    create = new CreateCatalogItemUseCase(catalog, userQuery, unitOfWork);
    update = new UpdateCatalogItemUseCase(catalog, userQuery, unitOfWork);
    remove = new DeleteCatalogItemUseCase(catalog, userQuery, unitOfWork);
  });

  describe('ListCatalogItems', () => {
    it('returns a page sorted by name with the total', async () => {
      const result = await list.execute({ userId: 'admin', page: 2, limit: 2 });

      expect(result.items.map((item) => item.name)).toEqual([
        'Tilt Super 300EC',
      ]);
      expect(result).toMatchObject({ total: 3, page: 2, limit: 2 });
    });

    it('searches ignoring case and diacritics', async () => {
      const result = await list.execute({
        userId: 'admin',
        search: 'DAM PHU',
        page: 1,
        limit: 20,
      });

      expect(result.items.map((item) => item.name)).toEqual(['Đạm Phú Mỹ']);
      expect(result.total).toBe(1);
    });
  });

  describe('CreateCatalogItem', () => {
    it('adds the item', async () => {
      const created = await create.execute({
        userId: 'admin',
        name: ' Amistar Top 325SC ',
        description: 'Azoxystrobin + Difenoconazole',
      });

      expect(created).toMatchObject({
        name: 'Amistar Top 325SC',
        description: 'Azoxystrobin + Difenoconazole',
      });
      expect(catalog.items.get(created.id)?.normalizedName).toBe(
        'amistar top 325sc',
      );
    });

    it('rejects a name already in the catalog (ignoring case and punctuation)', async () => {
      await expect(
        create.execute({
          userId: 'admin',
          name: 'ANVIL-5SC',
          description: 'x',
        }),
      ).rejects.toThrow(CatalogItemNameTakenException);
      expect(catalog.items.size).toBe(3);
    });

    it('rejects invalid content', async () => {
      await expect(
        create.execute({
          userId: 'admin',
          name: 'Anvil 10SC',
          description: ' ',
        }),
      ).rejects.toThrow(InvalidCatalogItemException);
    });
  });

  describe('UpdateCatalogItem', () => {
    it('changes the given fields only', async () => {
      const updated = await update.execute({
        userId: 'admin',
        catalogItemId: anvil.id,
        description: 'Hexaconazole 50 g/l',
      });

      expect(updated).toMatchObject({
        id: anvil.id,
        name: 'Anvil 5SC',
        description: 'Hexaconazole 50 g/l',
      });
    });

    it('keeps its own name when renamed to a variant of it', async () => {
      const updated = await update.execute({
        userId: 'admin',
        catalogItemId: anvil.id,
        name: 'ANVIL 5SC',
      });

      expect(updated.name).toBe('ANVIL 5SC');
    });

    it('rejects the name of another item and leaves the item unchanged', async () => {
      await expect(
        update.execute({
          userId: 'admin',
          catalogItemId: anvil.id,
          name: 'tilt super 300ec',
        }),
      ).rejects.toThrow(CatalogItemNameTakenException);
      expect(anvil.name).toBe('Anvil 5SC');
    });

    it('throws CatalogItemNotFound for an unknown id', async () => {
      await expect(
        update.execute({
          userId: 'admin',
          catalogItemId: 'missing',
          name: 'X',
        }),
      ).rejects.toThrow(CatalogItemNotFoundException);
    });
  });

  describe('DeleteCatalogItem', () => {
    it('removes the item', async () => {
      await remove.execute({ userId: 'admin', catalogItemId: anvil.id });

      expect(catalog.items.has(anvil.id)).toBe(false);
    });

    it('throws CatalogItemNotFound for an unknown id', async () => {
      await expect(
        remove.execute({ userId: 'admin', catalogItemId: 'missing' }),
      ).rejects.toThrow(CatalogItemNotFoundException);
    });
  });

  it.each([
    ['a distributor', { userId: 'u1', role: 'DISTRIBUTOR', isActive: true }],
    ['an inactive admin', { userId: 'admin', role: 'ADMIN', isActive: false }],
    ['an unknown user', null],
  ] as [string, TUserRoleSummary | null][])(
    'every use case rejects %s',
    async (_case, user) => {
      caller = user;

      await expect(
        list.execute({ userId: 'x', page: 1, limit: 20 }),
      ).rejects.toThrow(ProductAdminRequiredException);
      await expect(
        create.execute({ userId: 'x', name: 'A', description: 'B' }),
      ).rejects.toThrow(ProductAdminRequiredException);
      await expect(
        update.execute({ userId: 'x', catalogItemId: anvil.id, name: 'A' }),
      ).rejects.toThrow(ProductAdminRequiredException);
      await expect(
        remove.execute({ userId: 'x', catalogItemId: anvil.id }),
      ).rejects.toThrow(ProductAdminRequiredException);
    },
  );
});
