Feature: GET /knowledge/diseases/:code — `similarDiseases[].article` (DiseaseArticleResponse | null)

Flow: GetDiseaseDetail đã lấy bệnh tương tự qua `findDiseasesByCodes` → thêm mã bệnh tương tự vào `findPublishedByDiseaseCodes` → mỗi `similarDiseases[]` nhận bài chính (published) của bệnh đó, path theo slug crop của bệnh đó; không có bài / mã không có trong KB → null.

## Module knowledge
- [x] 1. [use-case]        GetDiseaseDetail: `similarDiseases[].article` = bài chính của bệnh tương tự (crop riêng của bệnh đó); unit test
- [x] 2. [http]            SimilarDiseaseResponse thêm `article: DiseaseArticleResponse | null`; e2e
- [x] 3. [api-docs]        GET /knowledge/diseases/:code; openapi:export
- [x] 4. [boundary-review]
