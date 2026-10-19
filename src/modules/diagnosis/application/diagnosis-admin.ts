import { IUserQueryPort } from '@modules/user/contracts';
import {
  DiagnosisAdminRequiredException,
  DiagnosisSettings,
  TDiagnosisSettingsProps,
} from '../domain';

/** Throws DiagnosisAdminRequiredException unless `userId` is an ACTIVE admin. */
export async function assertDiagnosisAdmin(
  userQuery: IUserQueryPort,
  userId: string,
): Promise<void> {
  const user = await userQuery.findRoleById(userId);
  if (!user || user.role !== 'ADMIN' || !user.isActive) {
    throw new DiagnosisAdminRequiredException(userId);
  }
}

export type TDiagnosisSettingsOutput = TDiagnosisSettingsProps;

export const toSettingsOutput = (
  settings: DiagnosisSettings,
): TDiagnosisSettingsOutput => ({
  dailyFreeLimit: settings.dailyFreeLimit,
  defaultCropType: settings.defaultCropType,
  maxImages: settings.maxImages,
  maxImageBytes: settings.maxImageBytes,
  maxImageWidth: settings.maxImageWidth,
  maxImageHeight: settings.maxImageHeight,
});
