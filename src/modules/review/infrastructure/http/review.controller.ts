import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import { CreateReviewUseCase } from '../../application/use-cases';
import { CreateReviewDto } from './dto';
import { CreateReviewResponse } from './responses/create-review.response';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly createReview: CreateReviewUseCase) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: CreateReviewDto,
  ): Promise<CreateReviewResponse> {
    const { reviewId } = await this.createReview.execute({
      userId: caller.userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      content: dto.content,
      star: dto.star,
    });
    return { reviewId };
  }
}
