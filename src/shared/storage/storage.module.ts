import { Global, Module } from '@nestjs/common';
import { FirebaseFileStorage } from './firebase.storage';
import { FILE_STORAGE } from './storage.interface';

@Global()
@Module({
  providers: [{ provide: FILE_STORAGE, useClass: FirebaseFileStorage }],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
