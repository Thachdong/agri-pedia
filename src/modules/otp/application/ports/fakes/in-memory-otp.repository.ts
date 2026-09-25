import { Otp } from '../../../domain';
import { IOtpRepository } from '../otp.repository';

export class InMemoryOtpRepository implements IOtpRepository {
  readonly items = new Map<string, Otp>();

  async save(otp: Otp): Promise<void> {
    this.items.set(otp.id, otp);
  }
}
