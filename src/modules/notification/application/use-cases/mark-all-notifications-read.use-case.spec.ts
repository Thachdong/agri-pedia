import { InMemoryUnitOfWork } from '@shared/database';
import { ENotificationType, Notification } from '../../domain';
import { InMemoryNotificationRepository } from '../ports/fakes';
import { MarkAllNotificationsReadUseCase } from './mark-all-notifications-read.use-case';

const newNotification = (userId: string) =>
  Notification.create({
    userId,
    type: ENotificationType.REVIEW,
    label: 'Đánh giá mới',
    content: 'Bạn nhận được đánh giá 5 sao',
    referenceId: 'review-1',
  });

describe('MarkAllNotificationsReadUseCase', () => {
  let notifications: InMemoryNotificationRepository;
  let useCase: MarkAllNotificationsReadUseCase;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    useCase = new MarkAllNotificationsReadUseCase(
      notifications,
      new InMemoryUnitOfWork(),
    );
  });

  it("marks all my notifications as read, not other users'", async () => {
    const unread = newNotification('u1');
    const read = newNotification('u1');
    read.markRead();
    const theirs = newNotification('u2');
    await notifications.save(unread);
    await notifications.save(read);
    await notifications.save(theirs);

    await useCase.execute({ userId: 'u1' });

    expect(notifications.items.get(unread.id)?.isRead).toBe(true);
    expect(notifications.items.get(read.id)?.isRead).toBe(true);
    expect(notifications.items.get(theirs.id)?.isRead).toBe(false);
  });

  it('succeeds when I have no notifications', async () => {
    await expect(useCase.execute({ userId: 'u1' })).resolves.toBeUndefined();
  });
});
