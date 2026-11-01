import { ILogger } from '@shared/logger';
import { IMessageSender, TOutboundMessage } from './messaging.interface';

const SEND_URL = 'https://api.speedsms.vn/index.php/sms/send';
/** SpeedSMS sender type: random sender number, no brandname needed. */
const RANDOM_NUMBER_TYPE = '2';
const TIMEOUT_MS = 10_000;

type TSpeedSmsResponse = {
  status: 'success' | 'error';
  code: string;
  message?: string;
  data?: { tranId: number; invalidPhone?: string[] };
};

/** `+84912...` / `84912...` / `0912...` -> `84912...`. */
const toSpeedSmsPhone = (phone: string): string => {
  const digits = phone.replace(/^\+/, '');
  return digits.startsWith('0') ? `84${digits.slice(1)}` : digits;
};

/** Sends PHONE messages as SMS through SpeedSMS from a random sender number (HTTP API). */
export class SpeedSmsSender implements IMessageSender {
  private readonly logger: ILogger;

  constructor(
    private readonly accessToken: string,
    logger: ILogger,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.logger = logger.withContext(SpeedSmsSender.name);
  }

  async send(message: TOutboundMessage): Promise<void> {
    const to = toSpeedSmsPhone(message.to);
    const query = new URLSearchParams({
      'access-token': this.accessToken,
      to,
      content: message.body,
      type: RANDOM_NUMBER_TYPE,
      sender: '',
    });
    const response = await this.fetchFn(`${SEND_URL}?${query}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`SpeedSMS HTTP ${response.status}`);
    }
    const result = (await response.json()) as TSpeedSmsResponse;
    if (result.status !== 'success') {
      throw new Error(`SpeedSMS error ${result.code}: ${result.message ?? ''}`);
    }
    if (result.data?.invalidPhone?.length) {
      throw new Error(`SpeedSMS rejected phone ${to}`);
    }
    // Body omitted: it may hold OTP codes.
    this.logger.info('SMS sent', { to, tranId: result.data?.tranId });
  }
}
