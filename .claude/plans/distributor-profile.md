# Feature: Public distributor profile (thông tin distributor + danh sách address)

Flow: `GET /distributors/:distributorId` (public, no guard) (user module)
  → user.GetDistributorProfile({ distributorId })
  (users.findById: null, role ≠ DISTRIBUTOR, status ≠ ACTIVE → 404 USER_DISTRIBUTOR_NOT_FOUND;
   addresses.findAllByUserId: primary first, then id)
  → 200 { id, username, avatar, bio, bussinessType, createdAt,
          addresses: [{ id, province, ward, houseNumber, lat, long, isPrimary }] }

No migration, no event, no new module. Farmer profile (private) = later feature, not in scope.

- [x] 1. [domain-model]     user: error USER_DISTRIBUTOR_NOT_FOUND (NOT_FOUND)
- [x] 2. [use-case]         user: GetDistributorProfile; port IAddressRepository.findAllByUserId (+ fake)
- [x] 3. [persistence]      user: PgAddressRepository.findAllByUserId (no migration)
- [ ] 4. [http]             GET /distributors/:distributorId (public, uuid param), response class, e2e
- [ ] 5. [api-docs]         GET /distributors/:distributorId (404 USER_DISTRIBUTOR_NOT_FOUND, 400 validation)
- [ ] 6. [boundary-review]

## Decisions (defaults — change if wrong)
- Unknown id / not DISTRIBUTOR / not ACTIVE (PENDING) → cùng 404 USER_DISTRIBUTOR_NOT_FOUND (không lộ user tồn tại).
- Public fields: id, username, avatar, bio, bussinessType, createdAt. Ẩn: loginType, identifier, businessLicense, status, updatedAt.
- Address trả đủ lat/long (giống /distributors/nearby đang public).
- Route nằm trong DistributorController sẵn có; `:distributorId` không đè `nearby` (route `nearby` khai báo trước + ParseUUIDPipe).

## Open questions
- none (avatar = media id, như /users/me + /distributors/nearby)
