import { Global, Module } from '@nestjs/common';
import { CRYPTO_SERVICE } from './crypto.interface';
import { NodeCryptoService } from './node.crypto';

@Global()
@Module({
  providers: [{ provide: CRYPTO_SERVICE, useClass: NodeCryptoService }],
  exports: [CRYPTO_SERVICE],
})
export class CryptoModule {}
