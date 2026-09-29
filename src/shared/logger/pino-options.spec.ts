import { redactRequestLocation } from './pino-options';

describe('redactRequestLocation', () => {
  it('masks lat/long in url and query, keeps the rest', () => {
    expect(
      redactRequestLocation({
        method: 'GET',
        url: '/distributors/nearby?lat=10.03&long=105.78&page=2',
        query: { lat: '10.03', long: '105.78', page: '2' },
      }),
    ).toEqual({
      method: 'GET',
      url: '/distributors/nearby?lat=%5BRedacted%5D&long=%5BRedacted%5D&page=2',
      query: { lat: '[Redacted]', long: '[Redacted]', page: '2' },
    });
  });

  it.each(['/provinces', '/products?limit=5'])('leaves %p untouched', (url) => {
    const req = { url, query: {} };
    expect(redactRequestLocation(req)).toBe(req);
  });
});
