/** What a media file is attached to; decides its storage folder. */
export enum EMediaOwnerType {
  PRODUCT = 'PRODUCT',
  USER_AVATAR = 'USER_AVATAR',
  USER_LICENSE = 'USER_LICENSE',
  /** Diagnosis images; uploaded by the server, not through TMP/presign. */
  DIAGNOSIS = 'DIAGNOSIS',
}
