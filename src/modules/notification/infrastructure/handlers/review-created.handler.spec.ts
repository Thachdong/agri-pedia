import { createIntegrationEvent } from '@shared/event-bus';
import { REVIEW_CREATED_EVENT } from '@modules/review/contracts';
import { CreateNotificationUseCase } from '../../application/use-cases';
import { ENotificationType } from '../../domain';
import { ReviewCreatedHandler } from './review-created.handler';

describe('ReviewCreatedHandler', () => {
  it('notifies the owner of the reviewed target', async () => {
    const execute = jest.fn().mockResolvedValue({ notificationId: 'n1' });
    const handler = new ReviewCreatedHandler({
      execute,
    } as unknown as CreateNotificationUseCase);

    await handler.handle(
      createIntegrationEvent(REVIEW_CREATED_EVENT, {
        reviewId: 'r1',
        reviewerId: 'farmer-1',
        targetType: 'PRODUCT' as const,
        targetId: 'product-1',
        targetOwnerId: 'distributor-1',
        star: 4,
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      userId: 'distributor-1',
      type: ENotificationType.REVIEW,
      label: 'Đánh giá mới',
      content: 'Bạn nhận được đánh giá 4 sao',
      referenceId: 'r1',
    });
  });
});
