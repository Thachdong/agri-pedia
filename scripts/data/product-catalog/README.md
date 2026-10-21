# Product catalog (product-suggestion KB)

`catalog-items.json` → `product_catalog_items` via `npm run seed:catalog` (insert only; names already in the DB are skipped).
Each item: `name` (trade name matched against the name read from the photo), `description` (suggested product description, Vietnamese), `source` (registration record).

## Scope

Biological products registered in Vietnam for the agents the crop packs recommend in `treatments.biological`
(`src/modules/knowledge/infrastructure/seed/crops/*/diseases.json`):

| Agent | Items | KB diseases |
|---|---|---|
| Trichoderma spp. | 16 (+ SH-Lifu) | RICE 5, DURIAN 6 |
| Bacillus subtilis | 9 (+ SH-Lifu) | RICE 4, DURIAN 2 |
| Pseudomonas fluorescens | 3 | RICE 1 |
| Streptomyces | Actinovate 1SP, SH-Lifu | DURIAN 4 |
| Beauveria bassiana / Metarhizium anisopliae | 6 | RICE 3, DURIAN 5 |
| Bacillus thuringiensis var. kurstaki (+ Granulosis virus) | 24 | DURIAN 1 |
| Nematode-parasitic fungi (Paecilomyces lilacinus, Verticillium chlamydosporium) | 5 | RICE 1 |

The disease list in each description is generated from the crop packs; regenerate the file when a pack's biological treatments change.

Not covered: chemical pesticides (the crop packs name none), fertilizers / soil amendments from `treatments.nutrition`
(K, Mg, Zn, lime, humic/fulvic), mycorrhizae, and Bt var. aizawai products (not recommended by the packs).

## Source

CABI BioProtection Portal, Vietnam (data from the Plant Production and Protection Department, MAE; records last updated 2024):
https://bioprotectionportal.com/find-products/product-sitemap/ — registrant and active ingredients copied from each record (`source`).
Registration status changes with each yearly pesticide list circular; check the current list before publishing a product as registered.
Target crops, pests and dosage are not in the source, so descriptions point to the product label instead of stating them.
