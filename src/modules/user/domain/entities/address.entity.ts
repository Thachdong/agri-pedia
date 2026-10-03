import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { PrimaryAddressNotDeletableException } from '../exceptions/primary-address-not-deletable.exception';
import { Coordinates } from '../value-objects/coordinates.vo';

export type TAddressProps = {
  userId: string;
  province: string;
  ward: string;
  houseNumber: string;
  coordinates: Coordinates;
  isPrimary: boolean;
};

export type TCreateAddressProps = Omit<TAddressProps, 'isPrimary'>;

export type TCreateUserAddressProps = TCreateAddressProps & {
  /** Default false. */
  isPrimary?: boolean;
};

export class Address extends AggregateRoot {
  private constructor(
    id: string,
    private props: TAddressProps,
  ) {
    super(id);
  }

  /** First address of a user: always primary. */
  static createPrimary(input: TCreateAddressProps): Address {
    return Address.create({ ...input, isPrimary: true });
  }

  /** Another address of a user; making it primary means unmarking the current primary first. */
  static create(input: TCreateUserAddressProps): Address {
    return new Address(randomUUID(), {
      userId: input.userId,
      province: input.province.trim(),
      ward: input.ward.trim(),
      houseNumber: input.houseNumber.trim(),
      coordinates: input.coordinates,
      isPrimary: input.isPrimary ?? false,
    });
  }

  static restore(id: string, props: TAddressProps): Address {
    return new Address(id, { ...props });
  }

  markPrimary(): void {
    this.props.isPrimary = true;
  }

  unmarkPrimary(): void {
    this.props.isPrimary = false;
  }

  /** The primary address is never deleted, so a user always keeps one. */
  assertDeletable(): void {
    if (this.props.isPrimary) {
      throw new PrimaryAddressNotDeletableException(this.id);
    }
  }

  get userId(): string {
    return this.props.userId;
  }

  get province(): string {
    return this.props.province;
  }

  get ward(): string {
    return this.props.ward;
  }

  get houseNumber(): string {
    return this.props.houseNumber;
  }

  get coordinates(): Coordinates {
    return this.props.coordinates;
  }

  get isPrimary(): boolean {
    return this.props.isPrimary;
  }
}
