export class PresignedMediaResponse {
  /** Signed PUT URL, valid for the configured TTL. Max upload size 10 MB. */
  presignUrl: string;
  /** Object key in TMP; send it back when confirming the upload. */
  key: string;
  /** Send exactly these headers with the PUT, otherwise the storage rejects it. */
  headers: Record<string, string>;
}

export class GetPresignUrlResponse {
  /** Same order as the requested `files`. */
  items: PresignedMediaResponse[];
}
