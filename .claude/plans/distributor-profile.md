# Feature: Public distributor profile + list addresses (login)

Flow A (changed): `GET /distributors/:distributorId` (public, no guard) (user module)
  → user.GetDistributorProfile({ distributorId })
  (users.findById: null, role ≠ DISTRIBUTOR, status ≠ ACTIVE → 404 USER_DISTRIBUTOR_NOT_FOUND;
   addresses.findPrimaryByUserId)
  → 200 { id, username, avatar, bio, bussinessType, createdAt,
          address: { province, ward, houseNumber, lat, long } | null }   (primary only)

Flow B (new): `GET /users/me/addresses` + `Authorization: Bearer` (AccessTokenGuard → 401) (user module)
  → user.ListMyAddresses({ userId: caller })
  (users.findById: null → 404 USER_NOT_FOUND (existing, như /users/me); addresses.findAllByUserId: primary first, then id)
  → 200 { addresses: [{ id, province, ward, houseNumber, lat, long, isPrimary }] }

No migration, no event, no new module. Farmer profile (private) = later feature, not in scope.

## Part 1 — public profile (done)
- [x] 1. [domain-model]     user: error USER_DISTRIBUTOR_NOT_FOUND (NOT_FOUND)
- [x] 2. [use-case]         user: GetDistributorProfile; port IAddressRepository.findAllByUserId (+ fake)
- [x] 3. [persistence]      user: PgAddressRepository.findAllByUserId (no migration)
- [x] 4. [http + api-docs]  GET /distributors/:distributorId (public, uuid param), response class, e2e; docs 404 USER_DISTRIBUTOR_NOT_FOUND, 400 validation
       (merged: defineApiDocs requires an entry per controller method, build fails without it)
- [x] 5. [boundary-review]

## Part 2 — profile chỉ trả primary address; API address riêng (login)
- [x] 6. [use-case]         GetDistributorProfile: `addresses[]` → `address` (primary, findPrimaryByUserId) | null
- [x] 7. [http + api-docs]  GET /distributors/:distributorId: response `address`; e2e + docs cập nhật
- [x] 8. [use-case]         user: ListMyAddresses (IUserRepository.findById, IAddressRepository.findAllByUserId — đã có)
- [x] 9. [http + api-docs]  GET /users/me/addresses (AccessTokenGuard, UserController), response, e2e; docs auth: true, 404 USER_NOT_FOUND
- [x] 10. [boundary-review]

## Decisions (defaults — change if wrong)
- Unknown id / not DISTRIBUTOR / not ACTIVE (PENDING) → cùng 404 USER_DISTRIBUTOR_NOT_FOUND (không lộ user tồn tại).
- Public fields: id, username, avatar, bio, bussinessType, createdAt. Ẩn: loginType, identifier, businessLicense, status, updatedAt.
- Profile `address` cùng shape với `address` của /users/me (không id, không isPrimary); distributor chưa có primary → null.
- Address trả đủ lat/long (giống /distributors/nearby đang public).
- Route nằm trong DistributorController sẵn có; `:distributorId` không đè `nearby` (route `nearby` khai báo trước + ParseUUIDPipe).
- avatar = media id, như /users/me + /distributors/nearby.
- ListMyAddresses: chỉ address của caller; FARMER hoặc DISTRIBUTOR; không check status (giống /users/me).
- Response bọc `{ addresses: [...] }` (để sau thêm field không phá contract), không phân trang (mỗi user ít address).

## Open questions
- none (API address = (b) `GET /users/me/addresses`)
