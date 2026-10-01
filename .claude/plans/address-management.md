# Feature: Address management của user đang login (spec #11 create, #12 set primary, #23 delete)

Nguồn: specs/api.md #11, #12, #23. WHO: FARMER | DISTRIBUTOR, cần login (AccessTokenGuard → 401). Module `user`, bảng `addresses` (đã có).

Flow A (#11): `POST /users/me/addresses` { province, ward, houseNumber, lat, long, isPrimary? }
  → user.CreateAddress({ userId: caller, ... })
  (Coordinates sai → 400 USER_INVALID_COORDINATES; ILocationQueryPort.wardBelongsToProvince sai → 400 USER_LOCATION_INVALID;
   transaction: isPrimary → primary cũ unmarkPrimary + save trước, rồi save address mới)
  → 201 { addressId }

Flow B (#12): `PATCH /users/me/addresses/:addressId/primary`
  → user.SetPrimaryAddress({ userId: caller, addressId })
  (findById: null hoặc userId ≠ caller → 404 USER_ADDRESS_NOT_FOUND; đã primary → no-op;
   transaction: primary cũ unmarkPrimary + save trước, rồi address này markPrimary + save)
  → 200 null

Flow C (#23): `DELETE /users/me/addresses/:addressId`
  → user.DeleteAddress({ userId: caller, addressId })
  (findById: null hoặc userId ≠ caller → 404 USER_ADDRESS_NOT_FOUND;
   isPrimary → 409 USER_ADDRESS_PRIMARY_NOT_DELETABLE; hard delete)
  → 200 null

No migration, no event, no new module.

- [x] 1. [domain-model]     user: Address.create (isPrimary tuỳ chọn), markPrimary(), unmarkPrimary();
                             errors USER_ADDRESS_NOT_FOUND (NOT_FOUND), USER_ADDRESS_PRIMARY_NOT_DELETABLE (CONFLICT)
- [x] 2. [use-case]         CreateAddress (ILocationQueryPort đã có; IAddressRepository.save / findPrimaryByUserId đã có)
- [x] 3. [use-case]         SetPrimaryAddress; port IAddressRepository.findById (+ fake)
- [ ] 4. [use-case]         DeleteAddress; port IAddressRepository.delete (+ fake)
- [ ] 5. [persistence]      PgAddressRepository.findById, delete (no migration)
- [ ] 6. [http + api-docs]  POST /users/me/addresses → 201 { addressId }, e2e
- [ ] 7. [http + api-docs]  PATCH /users/me/addresses/:addressId/primary → 200 null, e2e
- [ ] 8. [http + api-docs]  DELETE /users/me/addresses/:addressId → 200 null, e2e
- [ ] 9. [boundary-review]

## Decisions (defaults — change if wrong)
- Address của user khác → 404 USER_ADDRESS_NOT_FOUND (không lộ address tồn tại), không 403.
- `isPrimary` optional, mặc định false.
- Set primary cho address đã là primary → 200, không đổi gì.
- Đổi primary: unmark cũ trước, mark mới sau, cùng transaction (unique partial index `UQ_addresses_user_primary`).
  Hai request đổi primary đồng thời của cùng user → có thể 500 do vi phạm unique index; chấp nhận (hiếm, gửi lại là xong).
- Delete: hard delete, response 200 null (giống DELETE /products/:id).
- Không giới hạn số address / user. Không check status user (giống /users/me).
- Đổi primary ảnh hưởng ngay /users/me, /distributors/:id, /distributors/nearby (đều đọc primary) — đúng ý.

## Open questions
- none (bỏ check "address cuối cùng" của spec #23: luôn là primary, đã bị chặn bởi USER_ADDRESS_PRIMARY_NOT_DELETABLE)
