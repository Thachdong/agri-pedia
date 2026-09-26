import { EMessageChannel, TOutboundMessage } from '@shared/messaging';
import { EOtpPurpose, EOtpSender, Otp } from '../../domain';

const CHANNEL_BY_SENDER: Record<EOtpSender, EMessageChannel> = {
  [EOtpSender.EMAIL]: EMessageChannel.EMAIL,
  [EOtpSender.PHONE]: EMessageChannel.PHONE,
};

const SUBJECT_BY_PURPOSE: Record<EOtpPurpose, string> = {
  [EOtpPurpose.ACTIVATE_DISTRIBUTOR]: 'AgriPedia - Kích hoạt tài khoản',
  [EOtpPurpose.RESET_PASSWORD]: 'AgriPedia - Đặt lại mật khẩu',
};

/** Message carrying the plain `code` of `otp` to `to`, with the minutes left before it expires. */
export const buildOtpMessage = (
  otp: Otp,
  to: string,
  code: string,
  now: Date,
): TOutboundMessage => {
  const minutesLeft = Math.ceil(
    (otp.expiredAt.getTime() - now.getTime()) / 60_000,
  );
  return {
    channel: CHANNEL_BY_SENDER[otp.sender],
    to,
    subject: SUBJECT_BY_PURPOSE[otp.purpose],
    body: `Mã xác thực AgriPedia của bạn là ${code}. Mã hết hạn sau ${minutesLeft} phút.`,
  };
};
