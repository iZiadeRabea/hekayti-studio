# Child photo safety — production gate
This is a privacy design, NOT implemented controls or legal compliance certification. Consent alone does not authorize every form of processing. Egyptian legal/privacy professional and actual provider terms must be reviewed before real customer data. No legal claim inferred from foreign guidance.

## Required before level4

Guardian authority/consent recorded privately, purpose (illustrated book/video), approved outputs/providers, retention/deletion explanation, withdrawal channel and optional non-photo alternative. Separate order permission from marketing/public sharing; no public sharing default. Don't collect child ID documents casually.

Validate file type/decoded format and bounded size; reject unsupported/malicious input, sanitize metadata/EXIF including location, process in isolated path; filename must not identify child. No background scan of family photo libraries. Original retained only long enough to obtain approved illustrated reference, then delete per approved policy; exact original/reference/output retention durations remain O, not silently guessed.

Encrypt storage at rest with protected keys, restricted owner access and OS security; transmission TLS. Keys not in source or recovery ZIP. Work storage outside repository preferable; ignored folders are not encryption. No photos in Git, test/demo, exception logs, analytics, screen captures or source cloud backups. Illustrated likeness plus name can still be personal data.

Provider checklist: child-photo use allowed, purpose/consent compatible, training/retention controls, location/transfers, deletion and subprocessors, licence for outputs, moderation and documented paid/terms version. Do not promise “not used for training” until contract/settings verified. Refuse photo transmission until approved.

## Lifecycle / deletion

PrivateProfile → PrivateAsset(original) → approved illustrated references → per-order derivatives.
Track consentRef, data class, retentionUntil, deletionRequestedAt, dependency list and access events (without image/name content).
Delete original, thumbnails, caches, provider copies where supported, candidate illustrations and derivatives according to policy; record outcome/exceptions. Backups require separate encrypted private-data strategy with expiry and key recovery. User source backups intentionally exclude these orders; never suggest Git/Drive source backup recovers customer library.

Deletion cannot recall delivered physical books or recipient copies; communicate limits. An audit stub should be minimal/non-identifying where feasible. Refuse release on unresolved consent, uncertain guardian authority, public reference URL or secrets/PII leakage.

MVP real-data blocker even for level1 names: private store, redacted logs and informed use. Synthetic-only implementation/testing until gates pass. No real photos collected or processed in Phase 1.
