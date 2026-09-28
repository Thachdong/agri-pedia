# Feature: Danh sách tỉnh/thành (province) và phường/xã (ward) — public

Nguồn: yêu cầu "lấy danh sách province → chọn province → lấy ward tương ứng", master data `province-data.json`
(`{ name, codename, level: 'PROVINCE' | 'WARD', province: codename tỉnh | null }`).
Trả lời: master data seed vào Postgres (giống categories).

Flow A: `GET /provinces` (không cần login)
  → location.ListProvinces → 200 { provinces: [{ codename, name }] }
Flow B: `GET /provinces/:provinceCode/wards` (không cần login)
  → location.ListWardsByProvince({ provinceCode })
  (provinceCode sai định dạng → 400; không tồn tại → 404 LOCATION_PROVINCE_NOT_FOUND)
  → 200 { wards: [{ codename, name }] }

- [x] 1. [module-scaffold]    module `location`
- [x] 2. [domain-model]       Province (codename, name), Ward (codename, name, provinceCodename) — chỉ đọc (restore); lỗi LOCATION_PROVINCE_NOT_FOUND (NOT_FOUND)
- [x] 3. [use-case]           ListProvinces, port ILocationRepository.listProvinces()
- [ ] 4. [use-case]           ListWardsByProvince, port ILocationRepository.provinceExists(code) + listWardsByProvince(code)
- [ ] 5. [persistence]        PgLocationRepository; bảng `provinces`, `wards` (FK wards → provinces, cùng module); migration tạo bảng + migration seed từ province-data.json (ward trùng codename trong cùng tỉnh: bản xuất hiện sau thêm hậu tố `_2`, `_3`...; khóa wards = (province_codename, codename))
- [ ] 6. [http]               GET /provinces, GET /provinces/:provinceCode/wards (public), e2e
- [ ] 7. [api-docs]           GET /provinces, GET /provinces/:provinceCode/wards
- [ ] 8. [boundary-review]

## Quyết định (mặc định — sửa nếu sai)
- Định danh dùng `codename` (vd. `ha_noi`, `phuong_ba_dinh`) — ổn định, dễ đọc; không sinh uuid.
- Thứ tự trả về giữ đúng thứ tự trong file (cột sort_order), không sort theo tên.
- Không phân trang (vài chục tỉnh, mỗi tỉnh vài chục–vài trăm phường/xã).
- Response chỉ `{ codename, name }`.
- Ward codename trùng giữa các tỉnh (406) ⇒ khóa ward = (province_codename, codename).
- 8 cặp ward trùng codename trong cùng tỉnh (tên chỉ khác dấu, vd. Văn Lang / Văn Lăng) ⇒ bản xuất hiện sau trong file đổi codename thành `<codename>_2` (đã duyệt). Ổn định miễn thứ tự file không đổi.
- Chỉ thêm API đọc. Không đổi Address của user (vẫn lưu chuỗi province/ward như hiện tại) — validate address theo master data là feature riêng nếu cần.
- Đổi master data sau này = migration seed mới.

## Open questions
- none
