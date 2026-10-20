# Feature: Diagnosis form settings public + remainingToday (spec 19102026)

Source: Specs/19102026 guest.md (guest thấy form chẩn đoán); quyết định A1 (số lượt còn lại trả trong settings, không ở /users/me vì user ↔ diagnosis sẽ thành vòng).

Flow: GET /diagnoses/settings (token tùy chọn) → diagnosis.GetDiagnosisFormSettings({ userId | null })
  → output cũ + remainingToday = max(0, dailyFreeLimit - số diagnosis của user từ 0h hôm nay UTC+7); guest → null

- [x] 1. [use-case]        GetDiagnosisFormSettings: input userId nullable, thêm remainingToday (dùng chung cách đếm ngày với CreateDiagnosis; repo countByUserSince đã có)
- [x] 2. [http]            GET /diagnoses/settings: OptionalAccessTokenGuard (các route khác giữ AccessTokenGuard), response thêm remainingToday; e2e guest / user
- [x] 3. [api-docs]        GET /diagnoses/settings: bỏ auth, mô tả remainingToday
- [x] 4. [boundary-review]
