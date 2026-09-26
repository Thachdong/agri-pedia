import {
  IAccessTokenService,
  TAccessTokenPayload,
} from './access-token.interface';

/** Test fake: readable token, records every signed payload. */
export class InMemoryAccessTokenService implements IAccessTokenService {
  readonly signed: TAccessTokenPayload[] = [];

  async sign(payload: TAccessTokenPayload): Promise<string> {
    this.signed.push(payload);
    return `access(${payload.userId})`;
  }
}
