# Feature: Profile trả email/phone (decrypt) + giấy phép kinh doanh dạng URL

Flow A (changed): `GET /users/me` (guarded) → user.GetMyProfile
  → decrypt `encryptedIdentifier` (ICryptoService) → `email` | `phone` theo loginType
  → bussinessLicense: media id → mediaQuery.findUrls('USER_LICENSE', userId, [mediaId]) → signed URL | null
  → 200 `{ ..., email, phone, bussinessLicense: <url> | null }`

Flow B (changed): `GET /distributors/:distributorId` (public) → user.GetDistributorProfile
  → cùng logic decrypt + license URL
  → 200 `{ ..., email, phone, bussinessLicense: <url> | null }`

Flow C (changed): `POST /auth/login` → user.LoginUser
  → `user` cùng logic decrypt + license URL (chung UserProfileResponse)

Cross-module: user → media qua `IMediaQueryPort` (contracts), UserModule import MediaModule (không vòng: media chỉ import user/contracts types).
No migration, no event, no new module.

- [x] 1. [query-port]       media: IMediaQueryPort.findUrls(ownerType 'USER_LICENSE', ownerId, mediaIds) → `{ mediaId, url }[]` (dùng IMediaRepository.findByOwner sẵn có, mọi media type); wire vào user module
- [ ] 2. [use-case]         user: GetMyProfile + GetDistributorProfile + LoginUser output thêm `email`, `phone`, `businessLicense` = URL (inject CRYPTO_SERVICE, MEDIA_QUERY_PORT)
- [ ] 3. [http + api-docs]  GET /users/me + GET /distributors/:distributorId + POST /auth/login: response thêm `email`, `phone`, `bussinessLicense` (URL); e2e + docs cập nhật
- [ ] 4. [boundary-review]

## Decisions (default — sửa nếu sai)
- Shape: 2 field `email: string | null`, `phone: string | null` (field không khớp loginType = null).
- `bussinessLicense` trên /users/me đổi nghĩa: media id → signed URL (breaking, field giữ tên). Không có / media row mất → null.
- /distributors/:id public: lộ email/phone + license URL cho người chưa login (thông tin liên hệ nhà phân phối).
- POST /auth/login `user` cũng trả email/phone + license URL (chung UserProfileResponse) — đã chốt (a).
- avatar giữ media id (không yêu cầu).

## Open questions
- none
