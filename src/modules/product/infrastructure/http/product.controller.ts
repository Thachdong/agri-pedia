import {
  Body,
  Controller,
  Delete,
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
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductDetailUseCase,
  ListDistributorProductsUseCase,
  UpdateProductUseCase,
} from '../../application/use-cases';
import {
  CreateProductDto,
  DEFAULT_PRODUCT_PAGE_SIZE,
  ListDistributorProductsQueryDto,
  ProductMediaDto,
  UpdateProductDto,
} from './dto';
import { CreateProductResponse } from './responses/create-product.response';
import { GetProductDetailResponse } from './responses/get-product-detail.response';
import { ListDistributorProductsResponse } from './responses/list-distributor-products.response';

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
    private readonly listDistributorProducts: ListDistributorProductsUseCase,
    private readonly getProductDetail: GetProductDetailUseCase,
  ) {}

  /** Public: no access token needed. */
  @Get()
  async listByDistributor(
    @Query() query: ListDistributorProductsQueryDto,
  ): Promise<ListDistributorProductsResponse> {
    const { products, nextCursor } = await this.listDistributorProducts.execute(
      {
        distributorId: query.distributorId,
        cursor: query.cursor,
        limit: query.limit ?? DEFAULT_PRODUCT_PAGE_SIZE,
      },
    );
    return {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        thumbnail: product.thumbnail,
        distributorId: product.distributorId,
        distributorName: product.distributorName,
      })),
      nextCursor,
    };
  }

  /** Public: no access token needed. */
  @Get(':productId')
  async getDetail(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<GetProductDetailResponse> {
    const product = await this.getProductDetail.execute({ productId });
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      unit: product.unit,
      categoryId: product.categoryId,
      status: product.status,
      distributorId: product.distributorId,
      media: product.media.map((item) => ({
        id: item.id,
        type: item.type,
        url: item.url,
      })),
    };
  }

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
