import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  SUGGESTION_PHOTO_MAX_BYTES,
  SuggestProductUseCase,
} from '../../application/use-cases';
import { SuggestProductResponse } from './responses/suggest-product.response';

/** Upload guard only (in memory): type and size are checked by the use case. */
const UPLOAD_LIMITS = { files: 1, fileSize: SUGGESTION_PHOTO_MAX_BYTES };

@Controller('products/suggestions')
export class ProductSuggestionController {
  constructor(private readonly suggestProduct: SuggestProductUseCase) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: UPLOAD_LIMITS }))
  async suggest(
    @CurrentUser() caller: TAccessTokenPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<SuggestProductResponse> {
    return this.suggestProduct.execute({
      userId: caller.userId,
      photo: {
        data: file?.buffer ?? Buffer.alloc(0),
        mimeType: file?.mimetype ?? '',
      },
    });
  }
}
