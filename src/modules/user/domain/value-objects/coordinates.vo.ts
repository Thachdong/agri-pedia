import { InvalidCoordinatesException } from '../exceptions/invalid-coordinates.exception';

export class Coordinates {
  private constructor(
    readonly lat: number,
    readonly long: number,
  ) {}

  static create(lat: number, long: number): Coordinates {
    const valid =
      Number.isFinite(lat) &&
      Number.isFinite(long) &&
      lat >= -90 &&
      lat <= 90 &&
      long >= -180 &&
      long <= 180;
    if (!valid) {
      throw new InvalidCoordinatesException(lat, long);
    }
    return new Coordinates(lat, long);
  }

  equals(other: Coordinates): boolean {
    return this.lat === other.lat && this.long === other.long;
  }
}
