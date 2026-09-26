import { RefreshToken } from '../../domain';

export interface IRefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
