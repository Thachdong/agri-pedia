import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import { CreateProductUseCase } from '../../application/use-cases';
import { CreateProductDto } from './dto';
import { CreateProductResponse } from './responses/create-product.response';

@Controller('products')
export class ProductController {
  constructor(private readonly createProduct: CreateProductUseCase) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: CreateProductDto,
  ): Promise<CreateProductResponse> {
    const { productId } = await this.createProduct.execute({
      userId: caller.userId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      categoryId: dto.categoryId,
      quantity: dto.quantity,
      unit: dto.unit,
      media: dto.media.map((file) => ({
        key: file.key,
        type: file.type,
        extension: file.extension,
        filename: file.filename,
        sortOrder: file.sortOrder,
      })),
    });
    return { productId };
  }
}
