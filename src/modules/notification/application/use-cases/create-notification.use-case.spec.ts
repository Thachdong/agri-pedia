import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryRealtimePublisher } from '@shared/realtime';
import { ENotificationType } from '../../domain';
import { InMemoryNotificationRepository } from '../ports/fakes';
import {
  CreateNotificationUseCase,
  NOTIFICATION_CREATED_REALTIME_EVENT,
} from './create-notification.use-case';

const input = {
  userId: 'distributor-1',
  type: ENotificationType.REVIEW,
  label: 'Đánh giá mới',
  content: 'Bạn nhận được đánh giá 5 sao',
  referenceId: 'review-1',
};

describe('CreateNotificationUseCase', () => {
  let notifications: InMemoryNotificationRepository;
  let realtime: InMemoryRealtimePublisher;
  let useCase: CreateNotificationUseCase;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    realtime = new InMemoryRealtimePublisher();
    useCase = new CreateNotificationUseCase(
      notifications,
      new InMemoryUnitOfWork(),
      realtime,
    );
  });

  it('saves an unread notification for the recipient', async () => {
    const { notificationId } = await useCase.execute(input);

    const saved = notifications.items.get(notificationId);
    expect(saved).toMatchObject({ ...input, isRead: false });
  });

  it('pushes the saved notification to the recipient', async () => {
    const { notificationId } = await useCase.execute(input);

    const saved = notifications.items.get(notificationId)!;
    expect(realtime.emitted).toEqual([
      {
        userId: 'distributor-1',
        event: NOTIFICATION_CREATED_REALTIME_EVENT,
        payload: {
          id: notificationId,
          type: ENotificationType.REVIEW,
          label: 'Đánh giá mới',
          content: 'Bạn nhận được đánh giá 5 sao',
          isRead: false,
          referenceId: 'review-1',
          createdAt: saved.createdAt.toISOString(),
        },
      },
    ]);
  });

  it('does not push when saving fails', async () => {
    jest.spyOn(notifications, 'save').mockRejectedValue(new Error('db down'));

    await expect(useCase.execute(input)).rejects.toThrow('db down');
    expect(realtime.emitted).toEqual([]);
  });
});
