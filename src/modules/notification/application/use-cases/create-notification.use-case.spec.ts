import { InMemoryUnitOfWork } from '@shared/database';
import { ENotificationType } from '../../domain';
import { InMemoryNotificationRepository } from '../ports/fakes';
import { CreateNotificationUseCase } from './create-notification.use-case';

describe('CreateNotificationUseCase', () => {
  let notifications: InMemoryNotificationRepository;
  let useCase: CreateNotificationUseCase;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    useCase = new CreateNotificationUseCase(
      notifications,
      new InMemoryUnitOfWork(),
    );
  });

  it('saves an unread notification for the recipient', async () => {
    const input = {
      userId: 'distributor-1',
      type: ENotificationType.REVIEW,
      label: 'Đánh giá mới',
      content: 'Bạn nhận được đánh giá 5 sao',
      referenceId: 'review-1',
    };

    const { notificationId } = await useCase.execute(input);

    const saved = notifications.items.get(notificationId);
    expect(saved).toMatchObject({ ...input, isRead: false });
  });
});
