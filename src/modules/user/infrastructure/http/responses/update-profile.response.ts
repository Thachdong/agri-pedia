import { EBusinessType } from '../../../domain';

export class UpdateProfileResponse {
  username: string;
  /** Signed read URL (expires); null if none. */
  avatar: string | null;
  bio: string | null;
  /** Media id. Spelling follows the API contract. */
  bussinessLicense: string | null;
  /** Spelling follows the API contract. */
  bussinessType: EBusinessType | null;
  updatedAt: Date;
}
