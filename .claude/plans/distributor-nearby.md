# Feature: FARMER tìm DISTRIBUTOR gần mình (+ validate province/ward lúc register)

Nguồn: discuss trong session. Farmer & distributor đều là `User` (user module), mỗi user có primary `Address`
(province, ward, houseNumber, lat, long — bắt buộc lúc register).

Flow A (fix register): `POST /auth/register`
  → user.RegisterUser → ILocationQueryPort.wardBelongsToProvince(province, ward) (location)
  → sai → 400 USER_LOCATION_INVALID; đúng → lưu như cũ

Flow B: `GET /distributors/nearby?lat&lng | ?provinceCode[&wardCode] | (trống)` (auth, chỉ FARMER)
  → user.FindNearbyDistributors
  nguồn: point query → area query (validate qua ILocationQueryPort) → tọa độ primary address farmer
  cascade (stage đầu tiên có kết quả, phân trang trong stage):
    point: `radius` (config, 30km) → `nationwide_by_distance` (KNN)
    area:  `province` (cùng ward lên trước) → `nationwide` (sort tên + id)
    hết → 200 items: []
  → 200 { scope, source, items: [{ userId, username, ..., distanceMeters? }], total }

## Part A — validate province/ward lúc register (merge riêng được)
- [x] 1. [query-port]     location: ILocationQueryPort.wardBelongsToProvince(provinceCode, wardCode); user inject
- [x] 2. [domain-model]   user: lỗi USER_LOCATION_INVALID (VALIDATION)
- [x] 3. [use-case]       RegisterUser: validate province/ward qua ILocationQueryPort trước khi lưu
- [x] 4. [api-docs]       POST register: province/ward = codename; lỗi USER_LOCATION_INVALID

## Part B — tìm distributor gần
- [x] 5. [config-group]   group `distributorSearch`: radiusKm (default 30)
- [x] 6. [domain-model]   user: lỗi USER_NEARBY_SEARCH_FARMER_ONLY (FORBIDDEN)
- [x] 6b. [query-port]    location: ILocationQueryPort.provinceExists(provinceCode) (area query chỉ có province)
- [ ] 7. [use-case]       FindNearbyDistributors (cascade + chọn nguồn); ports: IAddressRepository.findPrimaryByUserId, IDistributorSearchRepository (searchWithinRadius / searchNearest / searchInProvince / searchNationwide, mỗi method trả { items, total } đã phân trang) + fakes
- [ ] 8. [persistence]    image postgis/postgis:16; migration CREATE EXTENSION postgis + cột generated `addresses.location geography(Point,4326)` + GIST; implement query PostGIS
- [ ] 9. [http]           GET /distributors/nearby (DTO: point/area loại trừ nhau), response, e2e; bỏ lat/lng khỏi request log
- [ ] 10. [api-docs]      GET /distributors/nearby
- [ ] 11. [boundary-review]

## Quyết định (mặc định — sửa nếu sai)
- Thứ tự Part A lệch fixed order (query-port trước use-case) vì RegisterUser cần port đã có.
- Một lỗi USER_LOCATION_INVALID dùng chung cho register và area query sai.
- Tìm kiếm dùng primary address của distributor; chỉ distributor `ACTIVE`.
- Phân trang `page`/`limit`: default 20, max 50.
- Rỗng = 200 `items: []`, không throw.
- Không trả tọa độ farmer; distributor trả `distanceMeters` khi scope theo khoảng cách.
- Không flag `locationMissing`, không endpoint lưu vị trí riêng (mọi user có address từ register).
- Data address cũ: step 3 kiểm tra giá trị không khớp `provinces.codename`; data dev → reset, data thật → báo lại trước khi viết migration chuẩn hóa.
- PostGIS: nhớ đổi image cả môi trường e2e/CI; prod DB phải cho `CREATE EXTENSION postgis`.

## Open questions
- none
