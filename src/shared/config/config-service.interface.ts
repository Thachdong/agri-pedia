import { TConfigMap } from '@config';

export interface IConfigService {
  get<K extends keyof TConfigMap>(namespace: K): TConfigMap[K];
}

export const CONFIG_SERVICE = Symbol('CONFIG_SERVICE');
