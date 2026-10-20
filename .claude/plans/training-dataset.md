Feature: training dataset — collect HIGH-confidence diagnosis images (best-effort, independent of the diagnosis flow)

Flow: ProcessDiagnosis (COMPLETED) → after realtime emit, emits `diagnosis.case.completed` → dataset handles → CollectTrainingSamples (filter per image → download → quality gate → copy to `datasets/<crop>/<sampleId>.jpg` → save). Errors logged and dropped; no retry/backfill/feedback.

- [x] 1. [shared-wrapper]     storage: `IFileStorage.copyFile(fromKey, toKey)` (GCS server-side copy) + in-memory fake
- [x] 2. [config-group]       `dataset`: minShortSidePx, minSharpness, minBrightness, maxBrightness
- [x] 3. [adapter-tweak]      diagnosis: SharpImageProcessor.normalize → JPEG quality 90, chromaSubsampling 4:4:4, mozjpeg (no dedicated skill)
- [x] 4. [module-scaffold]    module `dataset`
- [x] 5. [domain-model]       entity TrainingSample, enum ELabelSource (AI_HIGH); selection rule: no conflict, stored image, exactly one disease, HIGH, no uncertain region; regions = HIGH regions of it
- [x] 6. [use-case]           CollectTrainingSamples; ports ITrainingSampleRepository, IImageQualityInspector (+ IFileStorage)
- [x] 7. [persistence]        PgTrainingSampleRepository, table `training_samples` unique (diagnosis_id, sort_order); + SharpImageQualityInspector adapter
- [x] 8. [integration-event]  ProcessDiagnosis emits `diagnosis.case.completed` after `emitToUser`, only when COMPLETED
- [x] 9. [event-handler]      dataset: `diagnosis.case.completed` → CollectTrainingSamples (catch + log)
- [x] 10. [boundary-review]
