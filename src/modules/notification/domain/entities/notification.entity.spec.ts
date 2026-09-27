import { ENotificationType } from '../enums/notification-type.enum';
import { Notification, TCreateNotificationProps } from './notification.entity';

const input: TCreateNotificationProps = {
  userId: 'distributor-1',
  type: ENotificationType.REVIEW,
  label: 'Đánh giá mới',
  content: 'Bạn nhận được đánh giá 5 sao',
  referenceId: 'review-1',
};

describe('Notification.create', () => {
  it('creates an unread notification with a new id', () => {
    const before = Date.now();
    const notification = Notification.create(input);

    expect(notification.id).toEqual(expect.any(String));
    expect(notification.isRead).toBe(false);
    expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(notification).toMatchObject(input);
  });

  it('allows no referenceId', () => {
    const notification = Notification.create({
      ...input,
      type: ENotificationType.PLATFORM,
      referenceId: null,
    });

    expect(notification.referenceId).toBeNull();
  });
});

describe('Notification.restore', () => {
  it('rebuilds a notification with its stored state', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const notification = Notification.restore('n1', {
      ...input,
      isRead: true,
      createdAt,
    });

    expect(notification.id).toBe('n1');
    expect(notification.isRead).toBe(true);
    expect(notification.createdAt).toBe(createdAt);
  });
});

describe('Notification.markRead', () => {
  it('marks an unread notification as read', () => {
    const notification = Notification.create(input);

    notification.markRead();

    expect(notification.isRead).toBe(true);
  });

  it('keeps a read notification read', () => {
    const notification = Notification.create(input);
    notification.markRead();

    notification.markRead();

    expect(notification.isRead).toBe(true);
  });
});
