import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  EProductUnit,
  InvalidProductCursorException,
  ProductDistributorNotFoundException,
} from '../../domain';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
  TProductPageKey,
} from '../ports/product.repository';

export type TListDistributorProductsInput = {
  distributorId: string;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TDistributorProductItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: EProductUnit;
  /** Signed read URL of the first image; null when the product has none. */
  thumbnail: string | null;
  distributorId: string;
  distributorName: string;
};

export type TListDistributorProductsOutput = {
  products: TDistributorProductItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ c: createdAt ISO, i: id }`. */
const encodeCursor = (key: TProductPageKey): string =>
  Buffer.from(
    JSON.stringify({ c: key.createdAt.toISOString(), i: key.id }),
  ).toString('base64url');

const decodeCursor = (cursor: string): TProductPageKey => {
  try {
    const { c, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const createdAt = new Date(c);
    if (
      typeof c !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { createdAt, id: i };
  } catch {
    throw new InvalidProductCursorException();
  }
};

/** Public listing of a distributor's ACTIVE products, newest first, keyset-paginated. */
@Injectable()
export class ListDistributorProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(
    input: TListDistributorProductsInput,
  ): Promise<TListDistributorProductsOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;

    const distributor = await this.userQuery.findProfileById(
      input.distributorId,
    );
    if (!distributor || distributor.role !== 'DISTRIBUTOR') {
      throw new ProductDistributorNotFoundException(input.distributorId);
    }

    // One extra row tells whether a next page exists.
    const rows = await this.products.findActiveByUser(input.distributorId, {
      after,
      limit: input.limit + 1,
    });
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    const thumbnails = new Map(
      (
        await this.mediaQuery.findThumbnails(
          'PRODUCT',
          page.map((product) => product.id),
        )
      ).map((thumbnail) => [thumbnail.ownerId, thumbnail.url]),
    );

    return {
      products: page.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        thumbnail: thumbnails.get(product.id) ?? null,
        distributorId: distributor.userId,
        distributorName: distributor.username,
      })),
      nextCursor,
    };
  }
}
