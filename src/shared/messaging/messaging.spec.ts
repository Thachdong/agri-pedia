import { IConfigService } from '@shared/config';
import { InMemoryLogger } from '@shared/logger';
import { ChannelMessageSender } from './channel.messaging';
import { InMemoryMessageSender } from './in-memory.messaging';
import { LogMessageSender } from './log.messaging';
import { EMessageChannel } from './messaging.interface';
import { SmtpEmailSender } from './smtp.messaging';
import { SpeedSmsSender } from './speedsms.messaging';

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

describe('SmtpEmailSender', () => {
  const transporterReturning = (messageId: string) => ({
    sendMail: jest.fn().mockResolvedValue({ messageId }),
  });

  it('sends the message as plain-text mail from the configured sender', async () => {
    const transporter = transporterReturning('<id-1>');
    const logger = new InMemoryLogger();
    await new SmtpEmailSender(
      transporter,
      'AgriPedia <no-reply@agripedia.vn>',
      logger,
    ).send(message);
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: 'AgriPedia <no-reply@agripedia.vn>',
      to: 'a@b.com',
      subject: 'Code',
      text: 'Your code is 123456',
    });
    expect(logger.entries[0].meta).toEqual({
      to: 'a@b.com',
      subject: 'Code',
      messageId: '<id-1>',
    });
  });

  it('rejects when the SMTP server refuses the mail', async () => {
    const transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('535 auth failed')),
    };
    const logger = new InMemoryLogger();
    await expect(
      new SmtpEmailSender(transporter, 'a@agripedia.vn', logger).send(message),
    ).rejects.toThrow('535 auth failed');
    expect(logger.entries).toHaveLength(0);
  });
});

describe('ChannelMessageSender', () => {
  it('hands each message to the sender of its channel', async () => {
    const email = new InMemoryMessageSender();
    const phone = new InMemoryMessageSender();
    const sender = new ChannelMessageSender({
      [EMessageChannel.EMAIL]: email,
      [EMessageChannel.PHONE]: phone,
    });
    const sms = { channel: EMessageChannel.PHONE, to: '0900000000', body: 'x' };
    await sender.send(message);
    await sender.send(sms);
    expect(email.sent).toEqual([message]);
    expect(phone.sent).toEqual([sms]);
  });
});

describe('SpeedSmsSender', () => {
  const sms = {
    channel: EMessageChannel.PHONE,
    to: '0912345678',
    body: 'Your code is 123456',
  };
  const fetchReturning = (body: unknown, status = 200) =>
    jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(body), { status }),
      ) as unknown as jest.MockedFunction<typeof fetch>;
  const success = {
    status: 'success',
    code: '00',
    data: { tranId: 42, invalidPhone: [] },
  };

  it.each([
    ['0912345678', '84912345678'],
    ['+84912345678', '84912345678'],
    ['84912345678', '84912345678'],
  ])('sends %s as %s from a random sender number', async (phone, expected) => {
    const fetchFn = fetchReturning(success);
    const logger = new InMemoryLogger();
    await new SpeedSmsSender('token-1', logger, fetchFn).send({
      ...sms,
      to: phone,
    });
    const url = new URL(fetchFn.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(
      'https://api.speedsms.vn/index.php/sms/send',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'access-token': 'token-1',
      to: expected,
      content: 'Your code is 123456',
      type: '2',
      sender: '',
    });
    expect(logger.entries[0].meta).toEqual({ to: expected, tranId: 42 });
  });

  it('rejects on a SpeedSMS error response', async () => {
    const fetchFn = fetchReturning({
      status: 'error',
      code: '300',
      message: 'not enough balance',
    });
    await expect(
      new SpeedSmsSender('t', new InMemoryLogger(), fetchFn).send(sms),
    ).rejects.toThrow('SpeedSMS error 300: not enough balance');
  });

  it('rejects when SpeedSMS reports the phone as invalid', async () => {
    const fetchFn = fetchReturning({
      ...success,
      data: { tranId: 1, invalidPhone: ['84912345678'] },
    });
    await expect(
      new SpeedSmsSender('t', new InMemoryLogger(), fetchFn).send(sms),
    ).rejects.toThrow('SpeedSMS rejected phone 84912345678');
  });

  it('rejects on a non-2xx HTTP status', async () => {
    const fetchFn = fetchReturning({}, 502);
    await expect(
      new SpeedSmsSender('t', new InMemoryLogger(), fetchFn).send(sms),
    ).rejects.toThrow('SpeedSMS HTTP 502');
  });
});
