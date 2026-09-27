import { createIntegrationEvent } from '@shared/event-bus';
import { PRODUCT_CREATED_EVENT } from '@modules/product/contracts';
import { ConfirmMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { ProductCreatedHandler } from './product-created.handler';

describe('ProductCreatedHandler', () => {
  it('confirms the TMP media of the product, uploaded by the seller', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new ProductCreatedHandler({
      execute,
    } as unknown as ConfirmMediaUseCase);
    const key = 'tmp/u1/0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10.png';

    await handler.handle(
      createIntegrationEvent(PRODUCT_CREATED_EVENT, {
        productId: 'p1',
        userId: 'u1',
        media: [
          {
            key,
            type: 'IMAGE' as const,
            extension: 'png',
            filename: 'front.png',
            sortOrder: 1,
          },
        ],
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      files: [
        {
          key,
          type: EMediaType.IMAGE,
          extension: 'png',
          filename: 'front.png',
          sortOrder: 1,
        },
      ],
    });
  });
});
