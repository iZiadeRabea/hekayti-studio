# Windows desktop/package feasibility

Windows 11 x64 (10.0.26200), Electron 44.5.1 / embedded Node 24.21.0 / Chromium 152.0.7977.130 / SQLite 3.53.4 tested. electron-builder 26.15.3 produces win-unpacked distributable; portable ZIP can be made from the complete directory. This is NOT an installed/public release. No signing certificate, automatic updater, registry modification or production icon polish.

Run `npm run package:win`, then `node scripts/desktop-smoke.mjs --packaged`. Smoke launches actual packaged executable with isolated writable data, verifies packaged flag, React render/bridge, no renderer require/process, initializes SQLite with 3 fixtures, Arabic save/load, Age Engine, staleness and both PDFs. Result JSON under ignored temp/phase2-smoke/<run>. Never claim file existence alone proves launch.

Bundled: main/preload/React assets, exact fixtures, fonts and OFL licence, Chromium/runtime DLLs and Electron licences. Unpacked directory must stay complete; moving EXE alone is insufficient. No database, local customer files, .env or paid provider credentials bundled.

Persistent synthetic data in %APPDATA%/Hekayti-Studio-Phase2-Synthetic, not replaceable binaries. Tests use explicit isolated roots. Updates replace only application directory; preserve data, snapshot/migrate using future approved operational recovery before real orders. No uninstaller currently exists or deletes data. No destructive retention cleanup.

Unsigned zip/executable may trigger Windows SmartScreen/security warnings; no warnings/settings bypassed. Metadata editing/signing disabled in test build, so executable may retain Electron resource branding; application window correctly identifies Hekayti. CLI packaging warns about missing author/description/transitive duplicate workspace references; no runtime function failure. Some benign GPU shutdown diagnostics observed on failed early smoke; successful final smoke verifies actual behavior. Production release needs signing/update threat review and device coverage.

Original hidden diagnostic launch did not expose a targetable UI; explicit win.show/focus after load fixes this. Real Windows window was then inspected/manually edited; native system appearance is not inferred from a web screenshot.

Verified distributable: dist/phase2-package/hekayti-studio-phase2-0.3.0-win-x64.zip (167,302,358 bytes), SHA256 4B6856DDE15E1E2C86FCEADF451AD9A735012D83F1882634339565CEAD60C6C3. Generated from the complete freshly rebuilt win-unpacked folder; executable actually smoke-tested after this build. ZIP remains ignored/local-only and is not a source-history backup or public release.
