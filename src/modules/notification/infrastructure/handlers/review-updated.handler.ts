import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  REVIEW_UPDATED_EVENT,
  TReviewUpdatedEvent,
} from '@modules/review/contracts';
import { CreateNotificationUseCase } from '../../application/use-cases';
import { ENotificationType } from '../../domain';

const REVIEW_UPDATED_NOTIFICATION_LABEL = 'Đánh giá được cập nhật';

/** Tells the distributor (shop owner or product seller) a review of theirs changed. */
@Injectable()
export class ReviewUpdatedHandler {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnIntegrationEvent(REVIEW_UPDATED_EVENT)
  async handle(event: TReviewUpdatedEvent): Promise<void> {
    await this.createNotification.execute({
      userId: event.payload.targetOwnerId,
      type: ENotificationType.REVIEW,
      label: REVIEW_UPDATED_NOTIFICATION_LABEL,
      content: `Một đánh giá đã được cập nhật thành ${event.payload.star} sao`,
      referenceId: event.payload.reviewId,
    });
  }
}
