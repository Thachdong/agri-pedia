import { InMemoryUnitOfWork } from '@shared/database';
import {
  ENotificationType,
  Notification,
  NotificationNotFoundException,
} from '../../domain';
import { InMemoryNotificationRepository } from '../ports/fakes';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';

const newNotification = (userId: string) =>
  Notification.create({
    userId,
    type: ENotificationType.REVIEW,
    label: 'Đánh giá mới',
    content: 'Bạn nhận được đánh giá 5 sao',
    referenceId: 'review-1',
  });

describe('MarkNotificationReadUseCase', () => {
  let notifications: InMemoryNotificationRepository;
  let useCase: MarkNotificationReadUseCase;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    useCase = new MarkNotificationReadUseCase(
      notifications,
      new InMemoryUnitOfWork(),
    );
  });

  it('marks my notification as read and leaves the others unread', async () => {
    const mine = newNotification('u1');
    const other = newNotification('u1');
    await notifications.save(mine);
    await notifications.save(other);

    await useCase.execute({ userId: 'u1', notificationId: mine.id });

    expect(notifications.items.get(mine.id)?.isRead).toBe(true);
    expect(notifications.items.get(other.id)?.isRead).toBe(false);
  });

  it('accepts a notification that is already read', async () => {
    const mine = newNotification('u1');
    mine.markRead();
    await notifications.save(mine);

    await expect(
      useCase.execute({ userId: 'u1', notificationId: mine.id }),
    ).resolves.toBeUndefined();
    expect(notifications.items.get(mine.id)?.isRead).toBe(true);
  });

  it('rejects an unknown id', async () => {
    await expect(
      useCase.execute({ userId: 'u1', notificationId: 'missing' }),
    ).rejects.toThrow(NotificationNotFoundException);
  });

  it("rejects someone else's notification as not found", async () => {
    const theirs = newNotification('u2');
    await notifications.save(theirs);

    await expect(
      useCase.execute({ userId: 'u1', notificationId: theirs.id }),
    ).rejects.toThrow(NotificationNotFoundException);
    expect(notifications.items.get(theirs.id)?.isRead).toBe(false);
  });
});
