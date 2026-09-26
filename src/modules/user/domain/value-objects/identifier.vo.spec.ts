import { ELoginType } from '../enums/login-type.enum';
import { Identifier } from './identifier.vo';

describe('Identifier', () => {
  it('normalizes email to trimmed lowercase', () => {
    expect(Identifier.create(ELoginType.EMAIL, '  Foo@Bar.COM ').value).toBe(
      'foo@bar.com',
    );
  });

  it('strips phone separators', () => {
    expect(Identifier.create(ELoginType.PHONE, ' 091 234-56.78 ').value).toBe(
      '0912345678',
    );
  });
});
