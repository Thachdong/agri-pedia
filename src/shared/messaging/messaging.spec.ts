import { IConfigService } from '@shared/config';
import { InMemoryLogger } from '@shared/logger';
import { LogMessageSender } from './log.messaging';
import { EMessageChannel } from './messaging.interface';

const configFor = (nodeEnv: string) =>
  ({ get: () => ({ nodeEnv }) }) as unknown as IConfigService;

const message = {
  channel: EMessageChannel.EMAIL,
  to: 'a@b.com',
  subject: 'Code',
  body: 'Your code is 123456',
};

describe('LogMessageSender', () => {
  it('puts the body in the log message outside production', async () => {
    const logger = new InMemoryLogger();
    await new LogMessageSender(logger, configFor('development')).send(message);
    expect(logger.entries[0].message).toBe(
      'Message sent (log only) EMAIL -> a@b.com: Your code is 123456',
    );
    expect(logger.entries[0].meta).toMatchObject({ to: 'a@b.com' });
  });

  it('omits the body in production', async () => {
    const logger = new InMemoryLogger();
    await new LogMessageSender(logger, configFor('production')).send(message);
    expect(logger.entries[0].message).toBe('Message sent (log only)');
    expect(logger.entries[0].meta).not.toHaveProperty('body');
  });
});
