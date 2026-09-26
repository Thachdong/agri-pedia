import { InvalidCoordinatesException } from '../exceptions/invalid-coordinates.exception';
import { Coordinates } from './coordinates.vo';

describe('Coordinates', () => {
  it('accepts boundary values', () => {
    const coordinates = Coordinates.create(-90, 180);
    expect(coordinates.lat).toBe(-90);
    expect(coordinates.long).toBe(180);
  });

  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
    [Number.NaN, 0],
  ])('rejects (%p, %p)', (lat, long) => {
    expect(() => Coordinates.create(lat, long)).toThrow(
      InvalidCoordinatesException,
    );
  });
});
