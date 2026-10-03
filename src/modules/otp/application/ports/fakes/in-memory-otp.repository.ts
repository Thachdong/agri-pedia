import { EOtpPurpose, Otp } from '../../../domain';
import { IOtpRepository } from '../otp.repository';

export class InMemoryOtpRepository implements IOtpRepository {
  readonly items = new Map<string, Otp>();

  async findLatest(
    hashedIdentifier: string,
    purpose: EOtpPurpose,
  ): Promise<Otp | null> {
    const matches = [...this.items.values()]
      .filter(
        (otp) =>
          otp.hashedIdentifier === hashedIdentifier && otp.purpose === purpose,
      )
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
    return matches[0] ?? null;
  }

  async save(otp: Otp): Promise<void> {
    this.items.set(otp.id, otp);
  }
}
