import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { ENotificationType } from '../enums/notification-type.enum';

export type TNotificationProps = {
  /** Recipient. */
  userId: string;
  type: ENotificationType;
  label: string;
  content: string;
  /** Id of the thing the notification is about (e.g. reviewId); null when none. */
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
};

export type TCreateNotificationProps = Omit<
  TNotificationProps,
  'isRead' | 'createdAt'
>;

export class Notification extends AggregateRoot {
  private constructor(
    id: string,
    private props: TNotificationProps,
  ) {
    super(id);
  }

  /** New notification starts unread. */
  static create(input: TCreateNotificationProps): Notification {
    return new Notification(randomUUID(), {
      ...input,
      isRead: false,
      createdAt: new Date(),
    });
  }

  static restore(id: string, props: TNotificationProps): Notification {
    return new Notification(id, { ...props });
  }

  /** No-op when already read. */
  markRead(): void {
    this.props = { ...this.props, isRead: true };
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): ENotificationType {
    return this.props.type;
  }

  get label(): string {
    return this.props.label;
  }

  get content(): string {
    return this.props.content;
  }

  get referenceId(): string | null {
    return this.props.referenceId;
  }

  get isRead(): boolean {
    return this.props.isRead;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
