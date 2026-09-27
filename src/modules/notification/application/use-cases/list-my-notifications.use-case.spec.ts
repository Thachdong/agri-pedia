import {
  ENotificationType,
  InvalidNotificationCursorException,
  Notification,
} from '../../domain';
import { InMemoryNotificationRepository } from '../ports/fakes';
import { ListMyNotificationsUseCase } from './list-my-notifications.use-case';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];

const notificationOf = (
  id: string,
  userId: string,
  createdAt: string,
  isRead = false,
) =>
  Notification.restore(id, {
    userId,
    type: ENotificationType.REVIEW,
    label: 'Đánh giá mới',
    content: 'Bạn nhận được đánh giá 5 sao',
    referenceId: 'review-1',
    isRead,
    createdAt: new Date(createdAt),
  });

describe('ListMyNotificationsUseCase', () => {
  let notifications: InMemoryNotificationRepository;
  let useCase: ListMyNotificationsUseCase;

  beforeEach(async () => {
    notifications = new InMemoryNotificationRepository();
    useCase = new ListMyNotificationsUseCase(notifications);
    await notifications.save(
      notificationOf(ids[0], 'u1', '2026-09-01T00:00:00Z', true),
    );
    await notifications.save(
      notificationOf(ids[1], 'u1', '2026-09-02T00:00:00Z'),
    );
    await notifications.save(
      notificationOf(ids[2], 'u1', '2026-09-02T00:00:00Z'),
    );
    await notifications.save(
      notificationOf(
        '00000000-0000-4000-8000-0000000000ff',
        'u2',
        '2026-09-03T00:00:00Z',
      ),
    );
  });

  it("returns only the caller's notifications, read and unread, newest first", async () => {
    const { notifications: items, nextCursor } = await useCase.execute({
      userId: 'u1',
      limit: 10,
    });

    // Same createdAt: higher id first.
    expect(items.map((item) => item.id)).toEqual([ids[2], ids[1], ids[0]]);
    expect(items[2]).toEqual({
      id: ids[0],
      type: ENotificationType.REVIEW,
      label: 'Đánh giá mới',
      content: 'Bạn nhận được đánh giá 5 sao',
      isRead: true,
      referenceId: 'review-1',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    expect(nextCursor).toBeNull();
  });

  it('pages with nextCursor until the last page', async () => {
    const first = await useCase.execute({ userId: 'u1', limit: 2 });
    expect(first.notifications.map((item) => item.id)).toEqual([
      ids[2],
      ids[1],
    ]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await useCase.execute({
      userId: 'u1',
      limit: 2,
      cursor: first.nextCursor!,
    });
    expect(second.notifications.map((item) => item.id)).toEqual([ids[0]]);
    expect(second.nextCursor).toBeNull();
  });

  it('returns no nextCursor when the page is exactly full', async () => {
    const { nextCursor } = await useCase.execute({ userId: 'u1', limit: 3 });

    expect(nextCursor).toBeNull();
  });

  it('returns an empty list for a user without notifications', async () => {
    await expect(useCase.execute({ userId: 'u3', limit: 10 })).resolves.toEqual(
      {
        notifications: [],
        nextCursor: null,
      },
    );
  });

  it.each([
    'not-base64-json',
    Buffer.from('{"c":"nope","i":"x"}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ c: '2026-09-01T00:00:00.000Z', i: 'not-a-uuid' }),
    ).toString('base64url'),
  ])('rejects cursor %p', async (cursor) => {
    await expect(
      useCase.execute({ userId: 'u1', limit: 10, cursor }),
    ).rejects.toThrow(InvalidNotificationCursorException);
  });
});
