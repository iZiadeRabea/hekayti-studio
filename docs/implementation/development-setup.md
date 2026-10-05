# Phase 2 development setup

Use the permanent repository, not Desktop/Story or a synced Drive tree. PowerShell 7, Git, Node 22.23.2/npm 12.0.2 tested; Electron embeds its own runtime. No API keys or paid services.

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run desktop
node scripts/ui-smoke.mjs
npm run package:win
node scripts/desktop-smoke.mjs --packaged
pwsh -File scripts/update-context.ps1
pwsh -File scripts/test.ps1
pwsh -File scripts/health-check.ps1
```

If Electron's trusted upstream install script was blocked by npm's script policy and electron/dist is missing: inspect node_modules/electron/install.js, then run `node node_modules/electron/install.js`. Never globally enable arbitrary install scripts. Tests/CI can use `npm ci --ignore-scripts`; UI/package tests require the actual Electron binary. esbuild uses its pinned platform optional package. electron-winstaller (unused NSIS/Squirrel transitive tooling) is not manually activated.

Full production builds bundle host/preload/renderer, exact three legacy fixtures, font subsets and OFL licence. npm package-lock pins integrity/versions. TypeScript files in workspace exports are bundled for desktop; web can later compile the same core. Build outputs ignored; no compiled database in distribution.

Structure and versions: phase2-overview.md. Node built-in SQLite is experimental in host Node 22; adapter replacement remains possible. This prototype is not a general project import/editor: validated file open is read-only, save creates new snapshots and refuses overwrite. Synthetic fixture creation is idempotent. `.env`/private data not loaded by the application.

For new-machine recovery, run bootstrap for foundation/skills, then install Node and npm ci. No token/auth files copied. Source archive restores source/history, not npm's entire registry; internet or separately trusted dependency cache is required for rebuilding. Portable package can run without developer Node, but it is not a production release.
