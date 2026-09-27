import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  UpdateProductUseCase,
} from '../../application/use-cases';
import { CreateProductDto, ProductMediaDto, UpdateProductDto } from './dto';
import { CreateProductResponse } from './responses/create-product.response';

const toMediaInput = (file: ProductMediaDto) => ({
  key: file.key,
  type: file.type,
  extension: file.extension,
  filename: file.filename,
  sortOrder: file.sortOrder,
});

@Controller('products')
export class ProductController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

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
      media: dto.media.map(toMediaInput),
    });
    return { productId };
  }

  @Patch(':productId')
  @UseGuards(AccessTokenGuard)
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<null> {
    await this.updateProduct.execute({
      userId: caller.userId,
      productId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      quantity: dto.quantity,
      unit: dto.unit,
      categoryId: dto.categoryId,
      status: dto.status,
      addMedia: dto.addMedia?.map(toMediaInput),
      removeMediaIds: dto.removeMediaIds,
    });
    return null;
  }

  @Delete(':productId')
  @UseGuards(AccessTokenGuard)
  async delete(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<null> {
    await this.deleteProduct.execute({ userId: caller.userId, productId });
    return null;
  }
}
