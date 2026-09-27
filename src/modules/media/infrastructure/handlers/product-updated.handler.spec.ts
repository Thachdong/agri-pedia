import { createIntegrationEvent } from '@shared/event-bus';
import {
  PRODUCT_UPDATED_EVENT,
  TProductUpdatedEventPayload,
} from '@modules/product/contracts';
import {
  ConfirmMediaUseCase,
  RemoveMediaUseCase,
} from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { ProductUpdatedHandler } from './product-updated.handler';

describe('ProductUpdatedHandler', () => {
  let removeExecute: jest.Mock;
  let confirmExecute: jest.Mock;
  let handler: ProductUpdatedHandler;

  const handle = (payload: Partial<TProductUpdatedEventPayload>) =>
    handler.handle(
      createIntegrationEvent(PRODUCT_UPDATED_EVENT, {
        productId: 'p1',
        userId: 'u1',
        addMedia: [],
        removeMediaIds: [],
        ...payload,
      }),
    );

  beforeEach(() => {
    removeExecute = jest.fn().mockResolvedValue(undefined);
    confirmExecute = jest.fn().mockResolvedValue(undefined);
    handler = new ProductUpdatedHandler(
      { execute: removeExecute } as unknown as RemoveMediaUseCase,
      { execute: confirmExecute } as unknown as ConfirmMediaUseCase,
    );
  });

  it('removes the requested media and confirms the new TMP media of the product', async () => {
    const key = 'tmp/u1/0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10.png';

    await handle({
      removeMediaIds: ['m1'],
      addMedia: [
        {
          key,
          type: 'IMAGE',
          extension: 'png',
          filename: 'side.png',
          sortOrder: 2,
        },
      ],
    });

    expect(removeExecute).toHaveBeenCalledWith({
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      mediaIds: ['m1'],
    });
    expect(confirmExecute).toHaveBeenCalledWith({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      files: [
        {
          key,
          type: EMediaType.IMAGE,
          extension: 'png',
          filename: 'side.png',
          sortOrder: 2,
        },
      ],
    });
  });

  it('calls nothing when both lists are empty', async () => {
    await handle({});

    expect(removeExecute).not.toHaveBeenCalled();
    expect(confirmExecute).not.toHaveBeenCalled();
  });
});
