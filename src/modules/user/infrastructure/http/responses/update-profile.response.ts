import { EBusinessType } from '../../../domain';

export class UpdateProfileResponse {
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  /** Media id. Spelling follows the API contract. */
  bussinessLicense: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  updatedAt: Date;
}
