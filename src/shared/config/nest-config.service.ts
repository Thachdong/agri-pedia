import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TConfigMap } from '@config';
import { IConfigService } from './config-service.interface';

@Injectable()
export class NestConfigService implements IConfigService {
  constructor(private readonly configService: ConfigService) {}

  get<K extends keyof TConfigMap>(namespace: K): TConfigMap[K] {
    return this.configService.getOrThrow<TConfigMap[K]>(namespace);
  }
}
