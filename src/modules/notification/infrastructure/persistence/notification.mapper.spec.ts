import { ENotificationType, Notification } from '../../domain';
import { NotificationMapper } from './notification.mapper';

describe('NotificationMapper', () => {
  it.each(['0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10', null])(
    'round-trips domain -> orm -> domain keeping every field (referenceId %p)',
    (referenceId) => {
      const notification = Notification.create({
        userId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
        type: ENotificationType.REVIEW,
        label: 'Đánh giá mới',
        content: 'Bạn nhận được đánh giá 5 sao',
        referenceId,
      });

      const restored = NotificationMapper.toDomain(
        NotificationMapper.toOrm(notification),
      );

      expect(restored).toEqual(notification);
    },
  );
});
