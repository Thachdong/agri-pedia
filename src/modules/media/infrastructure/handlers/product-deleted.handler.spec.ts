import { createIntegrationEvent } from '@shared/event-bus';
import { PRODUCT_DELETED_EVENT } from '@modules/product/contracts';
import { RemoveAllMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType } from '../../domain';
import { ProductDeletedHandler } from './product-deleted.handler';

describe('ProductDeletedHandler', () => {
  it('removes all media of the deleted product', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new ProductDeletedHandler({
      execute,
    } as unknown as RemoveAllMediaUseCase);

    await handler.handle(
      createIntegrationEvent(PRODUCT_DELETED_EVENT, { productId: 'p1' }),
    );

    expect(execute).toHaveBeenCalledWith({
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
    });
  });
});
