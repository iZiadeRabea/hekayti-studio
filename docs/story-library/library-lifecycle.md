# Library lifecycle and Inbox

Every new human or pasted idea enters GENERATED in Inbox. Explicit SAVE records SAVED; REVIEW records REVIEWED; APPROVE follows review; PROMOTE follows approval and creates PROMOTED_TO_LIBRARY. Direct review of a generated idea is allowed. ARCHIVE retains content/history, never hard-deletes. Archived records cannot be edited or revived silently.

Inbox offers USE_NOW for validated pasted concepts, SAVE, CREATE_STORY_FAMILY, PROMOTE (after review/approval), ARCHIVE, variant linkage and editorial scores. USE_NOW does not imply review, library promotion or story approval. It atomically installs the retained canonical candidates into the current request workflow, selects one and logs candidate/context usage. Another request revision or superseded imported set fails readably; regenerate from the new request/context rather than silently rebinding ownership.

Library approvals express reusable editorial curation, not canonical finished-story approval. Story text still requires current Blueprint/draft/QA and explicit acknowledgment of current advisory findings. Approved story references resolve exact retained report/draft/source hashes on reopen. Old story approvals cannot resurrect after source changes; Phase 3 invariants remain enforced.

Each lifecycle/feedback action appends an immutable revision and human alias/timestamp/event. CAS rejects stale updates. Stable event/import IDs make retries idempotent; different content with reused IDs is rejected. Usage is one explicit outcome per record/project/request: timesUsed, approvedCount and rejectedCount. Approved usage requires a retained canonical approval and prior use. Rejected outcomes are manual operator decisions; scores/counts are not automatic scientific quality measurements.
