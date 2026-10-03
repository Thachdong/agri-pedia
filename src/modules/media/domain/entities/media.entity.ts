import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EMediaOwnerType } from '../enums/media-owner-type.enum';
import { EMediaType } from '../enums/media-type.enum';
import { MediaExtension } from '../value-objects/media-extension.vo';

/** Storage folder per owner type. */
const OWNER_FOLDERS: Record<EMediaOwnerType, string> = {
  [EMediaOwnerType.PRODUCT]: 'products',
  [EMediaOwnerType.USER_AVATAR]: 'users',
  [EMediaOwnerType.USER_LICENSE]: 'users',
};

export type TMediaProps = {
  type: EMediaType;
  /** Lowercase, without leading dot. */
  extension: string;
  filename: string;
  /** Final storage key, e.g. `products/<productId>/<mediaId>.png`. */
  source: string;
  ownerType: EMediaOwnerType;
  ownerId: string;
  sortOrder: number | null;
};

export type TCreateMediaProps = {
  /** Id chosen by the owner's module when it must reference the media before it exists; generated when absent. */
  id?: string;
  type: EMediaType;
  extension: MediaExtension;
  filename: string;
  ownerType: EMediaOwnerType;
  ownerId: string;
  sortOrder?: number;
};

export class Media extends AggregateRoot {
  private constructor(
    id: string,
    private props: TMediaProps,
  ) {
    super(id);
  }

  /** Source key is derived from owner and new id: `<ownerFolder>/<ownerId>/<id>.<extension>`. */
  static create(input: TCreateMediaProps): Media {
    const id = input.id ?? randomUUID();
    return new Media(id, {
      type: input.type,
      extension: input.extension.value,
      filename: input.filename.trim(),
      source: `${OWNER_FOLDERS[input.ownerType]}/${input.ownerId}/${id}.${input.extension.value}`,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      sortOrder: input.sortOrder ?? null,
    });
  }

  static restore(id: string, props: TMediaProps): Media {
    return new Media(id, { ...props });
  }

  get type(): EMediaType {
    return this.props.type;
  }

  get extension(): string {
    return this.props.extension;
  }

  get filename(): string {
    return this.props.filename;
  }

  get source(): string {
    return this.props.source;
  }

  get ownerType(): EMediaOwnerType {
    return this.props.ownerType;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get sortOrder(): number | null {
    return this.props.sortOrder;
  }
}
