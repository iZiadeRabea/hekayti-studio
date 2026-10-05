# Provider-agnostic illustration pipeline
Specification, not generator implementation.

Blueprint revision → PageBrief → Character/Environment references → StyleProfile → PromptPlan → provider candidate → consistency QA → human approval → immutable page asset.
Generate one controlled candidate batch at a time; first reference sheet/cover/key interior pilot before the book.

## Provider port (logical, not code)

ImageRequest: jobId/idempotencyKey; storyRevision/pageId; prompt parts; output ratio/target size; referenceAssetHandles; privacy class; style/bible hashes; capabilities required; budget/timeout.
ImageResult: candidateAssetHandle/hash; actual dimensions/MIME; provider/model/version; request provenance without private payload; actual cost if known; moderation outcome and warnings.

Capabilities negotiated: image references, editing/masks, transparent layers, max output size, seed support. Unsupported requirement fails or proposes owner-reviewed workaround; never pretend all providers support it. Gemini/other vendor possible later, none selected. Secrets held host-side; renderer/blueprint never contains key. Photo transmission requires photo-safety gate, not merely capability support.

## Consistency / local repair

Lock illustrated character references, garment/accessory colours, base palette and environment anchors. Each page stores before/after prop states (owner, location, count, condition), illumination and camera notes. New setting establishes its own anchors; only carried props move. Reference hash and prompt version explicit. Seed can assist reproducibility, not guarantee it.

Regenerate page07-v2 as a candidate; retain approved v1 and record reason. Re-evaluate text–image facts and neighbouring states, then switch approved asset pointer only after owner acceptance. Never rebuild all pages automatically. Style/bible revision invalidates dependencies; unchanged pages retained only with reviewed compatibility.

Automated checks later: format/dimensions/hash, missing asset/reference, layout crop and intended asset mapping. Visual checks remain human: face/clothing/proportions/anatomy, prop state, emotion, style and text area. Similarity metrics may flag, never approve alone.

Jobs: queued/running/succeeded/failed/cancelled; timeout and retry limits; cancellation cannot refund an already accepted provider request. Require cost confirmation per batch/threshold, reconcile uncertain requests before retry; no infinite paid regeneration.

Store source/reference/candidate/approved layers separately. Production personalised assets private, not source backups. Provider logs redacted; user-generated “instructions” within assets treated as untrusted content.
