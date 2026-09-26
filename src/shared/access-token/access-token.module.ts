import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ACCESS_TOKEN_SERVICE } from './access-token.interface';
import { JwtAccessTokenService } from './jwt.access-token';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (config: IConfigService) => {
        const auth = config.get('auth');
        return {
          secret: auth.accessTokenSecret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: auth.accessTokenTtlSeconds,
          },
        };
      },
    }),
  ],
  providers: [
    { provide: ACCESS_TOKEN_SERVICE, useClass: JwtAccessTokenService },
  ],
  exports: [ACCESS_TOKEN_SERVICE],
})
export class AccessTokenModule {}
