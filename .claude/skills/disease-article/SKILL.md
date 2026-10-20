---
name: disease-article
description: Write (or rewrite) the Vietnamese disease article for one or more KB codes (disease or variant id) — gather context from the crop pack KB + public tier A sources, pick a licensed cover (specs/cover-images first), write <CROP>/<CODE>.md + .factcheck.md in Design/desease-detection/articles, then sync into the server crop pack. Use when asked to create, add, or regenerate an article for a disease / pest / disorder.
---

# disease-article

**Scope:** article content + its images + fact check for the given KB code(s), then `npm run sync-article`. **Out of scope:** server code, KB (`diseases.json`) changes, the article loader / seeder. If the KB entry is wrong or missing data, stop and report — do not edit the KB.

Paths below are relative to the server root (`Implements/server`):

| What | Path |
|---|---|
| Canonical format + content rules (read §3–§5 before writing) | `../../Design/desease-detection/article-plan.md` |
| Articles workspace (the source; **not under git**) | `../../Design/desease-detection/articles/` (= `ART/` below) |
| KB (source of article facts) | `src/modules/knowledge/infrastructure/seed/crops/<CROP>/diseases.json` |
| Text source registry + internal text copies | `ART/sources/registry.json`, `ART/sources/*.txt` |
| Image licence rules | `ART/image-sources.json` |
| Ready 16:9 covers + credits | `specs/cover-images/*.webp`, `specs/cover-images/CREDITS.md` |
| Approved examples (few-shot) | `ART/RICE/RICE_BROWN_SPOT.md` (main), `ART/RICE/RICE_BLAST__V1.md` (variant), `ART/RICE/STEM_BORER.md` (pest, external cover) |

Never hand-edit the server copies under `crops/<CROP>/articles/` — they are overwritten by the sync.

## Steps (per code)

### 1. Check the code
- `code` is a disease id or variant id in `crops/<CROP>/diseases.json`. Note `version` of that file → `kbVersion`.
- Variant (`<ID>__V<n>`): the main article `<ID>.md` must exist, and the variant must meet article-plan §3.3 (a tier A source describes it separately **and** ≥ 400 words of its own). Otherwise stop: it stays a `###` subsection of the main article.
- `ART/<CROP>/<CODE>.md` exists → this is a rewrite: keep `slug` (changing it breaks links) unless asked.

### 2. Build the context (facts only from here)
- KB entry: `names`, `category`, `agentType`, `affectedPart`, `pathogens`, `symptoms`, `variants`, `epidemiology`, `favorableConditions`, `treatments`, `diagnosisHelper.similarDiseases`, `unverifiedFields`, `references`.
- Similar diseases: their `names.vn`, and whether they have an article (link `/diseases/<CODE>` works either way; `::disease-card` only takes disease ids).
- Text sources, in this priority:
  1. **Tier A** already in `registry.json` (read its `file` text, not memory).
  2. New tier A source: IRRI Rice Knowledge Bank, CABI, FAO, ACIAR, EPPO, PPPW (lucidcentral), university extension (UF/IFAS EDIS, LSU AgCenter, UC IPM, UAEX…), peer-reviewed open-access papers (prefer DOI URLs).
  3. **Tier C** (Cục BVTV, Viện BVTV, SOFRI, ĐH Cần Thơ, PPD) only for Vietnam-specific facts with no tier A source; name it in the sentence ("Theo Cục BVTV…").
- A source is usable only if it is **public and clean**: openly readable without login / paywall, a named publisher, a stable official URL (publisher site or DOI, not a mirror, cache, or random re-upload), and it actually states the claim. Fetch it to confirm before citing.
- Never cite: news / blogs, provincial "chi cục" pages, company material (Syngenta, agro shops…), Wikipedia, AI-generated text (`diseases-gemini*`, `GEMINI_ONLY` entries). KB `references` often contain these — drop them.
- New source → save its text to `ART/sources/<snake_id>.txt` (raw PDF to `ART/sources/raw/`) and add an entry to `registry.json` (`tier`, `title` in citation form, `publisher`, `url`, `license`, `file`), same shape as existing entries.
- A KB fact with no tier A/C source → leave it out. Never fill gaps from general knowledge.

### 3. Images
Every article needs exactly one `cover` (16:9, file name = `<slug>.webp`). A variant's cover must differ from its main article's cover.

Cover, first match wins:
1. **`specs/cover-images/<code_lowercase>.webp`** if its source is allowed:
   - Wikimedia Commons rows in `CREDITS.md`: allowed (licences are PD / CC0 / CC BY / CC BY-SA). Credit = that row (author, licence, Commons file page URL), `source: "Wikimedia Commons"`.
   - `ml/data/raw/<source>/…` rows: allowed only if `image-sources.json` → `sources.<source>.allowed` is `true`; credit = that entry's `credit`. Today this **excludes** `minhhungg` and `paddy_doctor` (`rice_bacterial_blight`, `rice_brown_spot`, `rice_leaf_scald`, `rice_narrow_brown_spot`, `rice_tungro`, `stem_borer`).
   - A `Note` column (`host not durian`, `same genus …`, `vector …`) must show up in the caption, e.g. "Ảnh minh hoạ cùng chi, chụp trên cây khác".
2. Training photos: `uv run --with pillow python scripts/select_images.py <CODE>` (from `ART/`), view `_candidates/<CODE>.jpg`, pick.
3. External open-licence photo (Commons…): only licences in `image-sources.json` → `external.allowedLicenses` (no NC / ND / unknown). Download into `_candidates/commons/full/`.
4. Nothing valid → a crop illustration with caption "ảnh minh hoạ cây trồng, không phải cây bị bệnh"; flag it in the report.

Body images (optional, 0–3): only from 2 or 3, and only if the photo visibly matches the KB symptoms (training labels are noisy).

Export: write `ART/<CROP>/images/<CODE>/selection.json` (format in the `export_images.py` docstring). A cover from `specs/cover-images` is an `external` item with `"file": "../../../Implements/server/specs/cover-images/<name>.webp"`, `"cover": true`. Then from `ART/`:
```bash
uv run --with pillow python scripts/export_images.py <CODE> --write
```
It writes the `.webp` files and the `cover:` / `images:` frontmatter (credit marked "ảnh đã cắt, thu nhỏ").

### 4. Write `ART/<CROP>/<CODE>.md`
Follow article-plan §3 exactly; copy the shape of the examples. Key rules:
- Frontmatter: `slug` from `names.vn` without diacritics (variant: main slug + suffix), `title` ≤ 70 chars, `summary` 120–160 chars, `status: DRAFT`, `reviewedBy: null`, `reviewedAt: null`, `kbVersion`, `sources` = only the sources the text really uses, `generator: { model: "<current model id>", prompt: article-v1, at: <today> }`, `updatedAt: <today>`.
- Body: intro paragraph (no heading), then only these h2, in this order, dropping any with no sourced data: `Dấu hiệu nhận biết nhanh`, `Triệu chứng`, `Phân biệt với bệnh dễ nhầm`, `Nguyên nhân và điều kiện phát sinh`, `Phòng ngừa và xử lý`, `Khi nào cần hỏi chuyên gia`. No h1, no "Nguồn tham khảo" section.
- `Phòng ngừa và xử lý` ends with the `:::warning` block (no self-medicating; only pesticides on Vietnam's permitted list, ask BVTV / agro dealer). `Khi nào cần hỏi chuyên gia` ends with `::cta-diagnosis`.
- **No active ingredient, product name, or dose** (`WP`, `EC`, `SC`, `WG`, `g/l`, `ml/bình`…), even if the source lists them. No "burn the straw" advice.
- Rewrite in your own words for farmers: short sentences, explain a term the first time, Vietnamese decimal comma (`2,5 cm`). No copied sentences from sources. `unverifiedFields` → hedge ("thường", "theo một số tài liệu").
- Only allowed syntax: Markdown + GFM, `![alt](file.webp)` (alt = `images[].alt`), `[tên](/diseases/<CODE>)`, `:::warning`, `:::tip`, `::disease-card{code="<DISEASE_ID>"}`, `::cta-diagnosis`. No HTML.
- Length: 600–1.500 words (variant 400–1.000). Variant: link to the main article in the intro, summarise shared cause / prevention in 1–2 sentences + link, no repeated content. When a variant article is added, the main article's `### <variant>` shrinks to 2–4 sentences + "Chi tiết: [tên](/diseases/<VARIANT_ID>)".

### 5. Fact check → `ART/<CROP>/<CODE>.factcheck.md`
Re-read the article against the source texts (not against memory). Same table as `RICE_BROWN_SPOT.factcheck.md`: `# | Khẳng định | Nguồn (registry id) | Trạng thái`. Every claim maps to ≥ 1 source id in the article's `sources`. A claim with no support or contradicting a source → fix or delete it in the article, mark `FIXED`. End with "Đã bỏ: …" (dropped KB facts, chemicals, rejected images). No `OPEN` row may remain.

`status` stays `DRAFT` (human content review comes later). Set `REVIEWED` / `reviewedBy: AI` only if the user asks.

### 6. Self-lint (no `lint_articles.py` yet — check by hand)
- [ ] Frontmatter fields and limits above; `cover` ∈ `images`; every `![](file)` ∈ `images`; every image has `alt` + full `credit`.
- [ ] Cover is 16:9, 480–1200 px wide, ≤ 300 KB; body images long edge ≤ 1200 px, ≤ 300 KB.
- [ ] h2 set/order as in step 4; no h1, no HTML; only whitelisted directives; every `/diseases/<CODE>` exists in the same crop KB; `disease-card` codes are disease ids.
- [ ] No chemical names / dose patterns. Word count in range:
  ```bash
  python3 -c "import re,sys;t=open(sys.argv[1]).read().split('---',2)[2];t=re.sub(r'!\[[^\]]*\]\([^)]*\)|::[^\n]*|[#*|>\-:]','',t);print(len(t.split()))" ART/<CROP>/<CODE>.md
  ```
- [ ] `sources` URLs open publicly; every `sources` entry is used in the fact check.

### 7. Sync to the server
```bash
npm run sync-article -- --dry-run <CROP>   # review the file list
npm run sync-article -- <CROP>             # runs the server loader first; any error aborts with nothing written
```
Loader error → fix in `ART/`, rerun. Do not commit unless asked (the crop pack under `src/` is the only versioned copy, so tell the user to commit it).

## Report (Vietnamese)
Per code: slug, title, word count, cover (origin + licence), sources used (tier), facts dropped and why, anything flagged (illustration cover, variant kept as subsection, KB gaps). Then the sync result.
