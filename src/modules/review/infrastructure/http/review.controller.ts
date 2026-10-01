import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  CreateReviewUseCase,
  GetReviewSummaryUseCase,
  ListDistributorReviewsUseCase,
  UpdateReviewUseCase,
} from '../../application/use-cases';
import {
  CreateReviewDto,
  DEFAULT_REVIEW_PAGE_SIZE,
  GetReviewSummaryQueryDto,
  ListDistributorReviewsQueryDto,
  UpdateReviewDto,
} from './dto';
import { CreateReviewResponse } from './responses/create-review.response';
import { GetReviewSummaryResponse } from './responses/get-review-summary.response';
import { ListDistributorReviewsResponse } from './responses/list-distributor-reviews.response';

@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly createReview: CreateReviewUseCase,
    private readonly listDistributorReviews: ListDistributorReviewsUseCase,
    private readonly updateReview: UpdateReviewUseCase,
    private readonly getReviewSummary: GetReviewSummaryUseCase,
  ) {}

  /** Public: no access token needed. */
  @Get()
  async listByDistributor(
    @Query() query: ListDistributorReviewsQueryDto,
  ): Promise<ListDistributorReviewsResponse> {
    const { summary, reviews, nextCursor } =
      await this.listDistributorReviews.execute({
        distributorId: query.distributorId,
        targetType: query.targetType,
        star: query.star,
        cursor: query.cursor,
        limit: query.limit ?? DEFAULT_REVIEW_PAGE_SIZE,
      });
    return {
      summary: {
        avgRating: summary.avgRating,
        reviewCount: summary.reviewCount,
        starCounts: { ...summary.starCounts },
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        targetType: review.targetType,
        targetId: review.targetId,
        productName: review.productName,
        star: review.star,
        content: review.content,
        createdAt: review.createdAt,
        user: {
          id: review.user.id,
          username: review.user.username,
          avatar: review.user.avatar,
        },
      })),
      nextCursor,
    };
  }

  /** Public: no access token needed. */
  @Get('summary')
  async summary(
    @Query() query: GetReviewSummaryQueryDto,
  ): Promise<GetReviewSummaryResponse> {
    const summary = await this.getReviewSummary.execute({
      targetType: query.targetType,
      targetId: query.targetId,
    });
    return {
      avgRating: summary.avgRating,
      reviewCount: summary.reviewCount,
      oneStarCount: summary.oneStarCount,
      twoStarCount: summary.twoStarCount,
      threeStarCount: summary.threeStarCount,
      fourStarCount: summary.fourStarCount,
      fiveStarCount: summary.fiveStarCount,
    };
  }

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

  @Patch(':reviewId')
  @UseGuards(AccessTokenGuard)
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<null> {
    await this.updateReview.execute({
      userId: caller.userId,
      reviewId,
      content: dto.content,
      star: dto.star,
    });
    return null;
  }
}
