// Creates an ACTIVE ADMIN account (back office); log in with POST /auth/login afterwards.
// Usage: npm run create-admin -- <email|phone> [username]
// The password is asked on the terminal (not echoed, not kept in shell history).
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { AccessTokenModule } from '../src/shared/access-token';
import { SharedConfigModule } from '../src/shared/config';
import { CryptoModule } from '../src/shared/crypto';
import { DatabaseModule } from '../src/shared/database';
import { DomainException } from '../src/shared/domain';
import { EventBusModule } from '../src/shared/event-bus';
import { SharedLoggerModule } from '../src/shared/logger';
import { MessagingModule } from '../src/shared/messaging';
import { RealtimeModule } from '../src/shared/realtime';
import { StorageModule } from '../src/shared/storage';
import { CreateAdminUseCase } from '../src/modules/user/application/use-cases';
import { ELoginType } from '../src/modules/user/domain';
import { UserModule } from '../src/modules/user/user.module';

/** Same bounds as the registration DTO. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/** Only what UserModule needs: no HTTP server, no knowledge seed. */
@Module({
  imports: [
    SharedConfigModule,
    SharedLoggerModule,
    DatabaseModule,
    EventBusModule,
    CryptoModule,
    AccessTokenModule,
    MessagingModule,
    StorageModule,
    RealtimeModule,
    UserModule,
  ],
})
class CreateAdminCliModule {}

/**
 * Asks each question in turn without echoing the answers. Lines are queued, so piped input
 * (`printf 'pw\npw\n' | ...`) works too; input closed early rejects.
 */
function askHidden(questions: string[]): Promise<string[]> {
  let muted = false;
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const lines: string[] = [];
  let waiter: ((line: string | null) => void) | null = null;
  rl.on('line', (line) => {
    if (waiter) waiter(line);
    else lines.push(line);
  });
  rl.on('close', () => waiter?.(null));
  const nextLine = (): Promise<string | null> =>
    lines.length > 0
      ? Promise.resolve(lines.shift() ?? null)
      : new Promise((resolve) => {
          waiter = (line) => {
            waiter = null;
            resolve(line);
          };
        });

  return (async () => {
    const answers: string[] = [];
    for (const question of questions) {
      muted = false;
      output.write(question);
      muted = true;
      const answer = await nextLine();
      process.stdout.write('\n');
      if (answer === null) throw new Error('Input closed');
      answers.push(answer);
    }
    rl.close();
    return answers;
  })();
}

async function main(): Promise<void> {
  const [identifier, username] = process.argv.slice(2);
  if (!identifier) {
    console.error('Usage: npm run create-admin -- <email|phone> [username]');
    process.exit(1);
  }
  const [password, repeated] = await askHidden([
    'Password: ',
    'Repeat password: ',
  ]);
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    console.error(
      `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`,
    );
    process.exit(1);
  }
  if (repeated !== password) {
    console.error('Passwords do not match.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(CreateAdminCliModule, {
    logger: ['error', 'warn'],
  });
  try {
    const { userId } = await app.get(CreateAdminUseCase).execute({
      loginType: identifier.includes('@') ? ELoginType.EMAIL : ELoginType.PHONE,
      identifier,
      password,
      username,
    });
    console.log(`Admin created: ${userId}`);
  } catch (error) {
    if (error instanceof DomainException) {
      console.error(`${error.code}: ${error.message}`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  } finally {
    await app.close();
  }
}

void main();
