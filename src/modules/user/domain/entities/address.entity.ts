import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
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

export class Address extends AggregateRoot {
  private constructor(
    id: string,
    private props: TAddressProps,
  ) {
    super(id);
  }

  /** First address of a user: always primary. */
  static createPrimary(input: TCreateAddressProps): Address {
    return new Address(randomUUID(), {
      userId: input.userId,
      province: input.province.trim(),
      ward: input.ward.trim(),
      houseNumber: input.houseNumber.trim(),
      coordinates: input.coordinates,
      isPrimary: true,
    });
  }

  static restore(id: string, props: TAddressProps): Address {
    return new Address(id, { ...props });
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
