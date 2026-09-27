# Feature: Upload media — get presign URL (FARMER | DISTRIBUTOR)

Source: specs/api.md §10.1 get-presign-url. Storage: Firebase Storage (firebase-admin, one bucket `FIREBASE_STORAGE_BUCKET`; spec "buckets" TMP / USER / PRODUCT / REVIEW = key prefixes).

Flow: `POST /media/presign-url { filename, extension, type }` + `Authorization: Bearer <accessToken>` (media module)
  → AccessTokenGuard (401) → media.GetPresignUrl({ userId, filename, extension, type })
  (validate extension against type; contentType derived from extension; key = `tmp/{userId}/{uuid}.{extension}`;
   signed v4 PUT URL bound to Content-Type + x-goog-content-length-range 0..10MB, TTL from config)
  → 200 { presignUrl, key, headers: { Content-Type, x-goog-content-length-range } } — client must PUT with exactly these headers.
No DB table, no migration, no event, no cross-module call.
Out of scope (no caller yet): confirmMedia helper + Media table (comes with actions 9/13/14), TMP cleanup cron.

- [x] 1. [config-group]     `storage`: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET, STORAGE_PRESIGN_URL_TTL_SECONDS (new, default 900)
- [x] 2. [shared-wrapper]   storage: IFileStorage (FILE_STORAGE) — createPresignedUploadUrl({ key, contentType, maxSizeBytes }) (TTL read from config by adapter) → { url, headers }; firebase-admin adapter + in-memory fake
- [x] 3. [module-scaffold]  module `media`
- [x] 4. [domain-model]     EMediaType (IMAGE | VIDEO | FILE), VO MediaExtension (whitelist per type + contentType), MEDIA_MAX_SIZE_BYTES = 10MB; error MEDIA_INVALID_EXTENSION (VALIDATION)
- [x] 5. [use-case]         GetPresignUrl (uses IFileStorage, key generation)
- [ ] 6. [http]             POST /media/presign-url (guarded)
- [ ] 7. [api-docs]         POST /media/presign-url (auth: true)
- [ ] 8. [boundary-review]

## Decisions (approved)
1. Extension whitelist: IMAGE jpg/jpeg/png/webp; VIDEO mp4/mov; FILE pdf. Case-insensitive, leading dot stripped. Else MEDIA_INVALID_EXTENSION.
2. Content-Type bound into signed URL, derived server-side from extension (jpg/jpeg→image/jpeg, png→image/png, webp→image/webp, mp4→video/mp4, mov→video/quicktime, pdf→application/pdf); returned in `headers`.
3. Max 10MB (10485760 bytes) enforced by GCS via signed `x-goog-content-length-range: 0,10485760` header; returned in `headers`.
