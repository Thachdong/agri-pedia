import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  EMessageChannel,
  IMessageSender,
  MESSAGE_SENDER,
} from '@shared/messaging';
import { EOtpPurpose, EOtpSender, Otp } from '../../domain';
import { IOtpRepository, OTP_REPOSITORY } from '../ports/otp.repository';

export type TIssueOtpInput = {
  sender: EOtpSender;
  purpose: EOtpPurpose;
  /** Plain identifier, already normalized by the caller (same form the owner module hashes). */
  identifier: string;
};

export type TIssueOtpOutput = { otpId: string; expiredAt: string };

const CHANNEL_BY_SENDER: Record<EOtpSender, EMessageChannel> = {
  [EOtpSender.EMAIL]: EMessageChannel.EMAIL,
  [EOtpSender.PHONE]: EMessageChannel.PHONE,
};

const SUBJECT_BY_PURPOSE: Record<EOtpPurpose, string> = {
  [EOtpPurpose.ACTIVATE_DISTRIBUTOR]: 'AgriPedia - Kích hoạt tài khoản',
  [EOtpPurpose.RESET_PASSWORD]: 'AgriPedia - Đặt lại mật khẩu',
};

/** Creates a new OTP for the identifier and sends the code once it is stored. */
@Injectable()
export class IssueOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: IOtpRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(MESSAGE_SENDER) private readonly messageSender: IMessageSender,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TIssueOtpInput): Promise<TIssueOtpOutput> {
    const { length, ttlSeconds } = this.config.get('otp');
    const code = this.crypto.randomDigits(length);
    const otp = Otp.issue({
      sender: input.sender,
      purpose: input.purpose,
      hashedIdentifier: this.crypto.hash(input.identifier),
      encryptedCode: this.crypto.encrypt(code),
      ttlSeconds,
    });

    await this.unitOfWork.runInTransaction(() => this.otps.save(otp));

    await this.messageSender.send({
      channel: CHANNEL_BY_SENDER[input.sender],
      to: input.identifier,
      subject: SUBJECT_BY_PURPOSE[input.purpose],
      body: `Mã xác thực AgriPedia của bạn là ${code}. Mã hết hạn sau ${Math.ceil(ttlSeconds / 60)} phút.`,
    });

    return { otpId: otp.id, expiredAt: otp.expiredAt.toISOString() };
  }
}
