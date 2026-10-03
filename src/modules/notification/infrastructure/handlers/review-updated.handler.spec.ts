import { createIntegrationEvent } from '@shared/event-bus';
import { REVIEW_UPDATED_EVENT } from '@modules/review/contracts';
import { CreateNotificationUseCase } from '../../application/use-cases';
import { ENotificationType } from '../../domain';
import { ReviewUpdatedHandler } from './review-updated.handler';

describe('ReviewUpdatedHandler', () => {
  it('notifies the owner of the reviewed target', async () => {
    const execute = jest.fn().mockResolvedValue({ notificationId: 'n1' });
    const handler = new ReviewUpdatedHandler({
      execute,
    } as unknown as CreateNotificationUseCase);

    await handler.handle(
      createIntegrationEvent(REVIEW_UPDATED_EVENT, {
        reviewId: 'r1',
        targetOwnerId: 'distributor-1',
        star: 3,
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      userId: 'distributor-1',
      type: ENotificationType.REVIEW,
      label: 'Đánh giá được cập nhật',
      content: 'Một đánh giá đã được cập nhật thành 3 sao',
      referenceId: 'r1',
    });
  });
});
