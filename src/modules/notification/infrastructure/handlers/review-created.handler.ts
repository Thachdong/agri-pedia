import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  REVIEW_CREATED_EVENT,
  TReviewCreatedEvent,
} from '@modules/review/contracts';
import { CreateNotificationUseCase } from '../../application/use-cases';
import { ENotificationType } from '../../domain';

const REVIEW_NOTIFICATION_LABEL = 'Đánh giá mới';

/** Tells the distributor (shop owner or product seller) about a new review. */
@Injectable()
export class ReviewCreatedHandler {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnIntegrationEvent(REVIEW_CREATED_EVENT)
  async handle(event: TReviewCreatedEvent): Promise<void> {
    await this.createNotification.execute({
      userId: event.payload.targetOwnerId,
      type: ENotificationType.REVIEW,
      label: REVIEW_NOTIFICATION_LABEL,
      content: `Bạn nhận được đánh giá ${event.payload.star} sao`,
      referenceId: event.payload.reviewId,
    });
  }
}
