#requires -Version 7.0
param([string]$OriginalWorkspace='C:\Users\Ziad\Desktop\Story')
. "$PSScriptRoot/common.ps1"
$codexRoot=Join-Path $env:USERPROFILE '.codex'
# Names exposed in this task's runtime catalog at initial inspection. Do not equate cache files with session exposure.
$sessionNames=@('imagegen','openai-docs','skill-creator','skill-installer','beta-reader-critique-simulator','braille-accessibility-formatter','character-designer-psychologist','children-story-creator','comic-webtoon-scriptwriter','fiction-agent-update-manager','fiction-book-orchestrator','fiction-cover-designer','fiction-layout-exporter','fiction-market-trend-analyst','novel-scene-writer','plot-hole-continuity-checker','plot-narrative-architect','prose-dialogue-polisher','story-concept-intake','storyboard-scene-planner','wattpad-publisher-formatter','worldbuilding-architect','computer-use','documents','google-docs','google-drive','google-drive-comments','google-sheets','google-slides','pdf','picture-book-generator','plugin-management','presentations','sites','spreadsheets','excel-live-control','adaptation','chapter-writing','character-management','discovery-drafting','editorial-review','feedback-triage','genre-craft','line-editing','plot-structure','premise-workshop','publishing','reader-panel','research','revision-continuity','scene-craft','series-continuity','story-init','story-maintenance','submission','theme-craft','verse-craft','voice-style','worldbuilding','template-creator','visualize','create-pet','pets','update-pet')
function Read-SkillMetadata([string]$Path) {
    $raw=Get-Content -Raw -LiteralPath $Path
    $front=[regex]::Match($raw,'(?s)\A---\r?\n(.*?)\r?\n---')
    $name=[regex]::Match($front.Groups[1].Value,'(?m)^name:\s*(.+)$').Groups[1].Value.Trim().Trim('"',"'")
    $desc=[regex]::Match($front.Groups[1].Value,'(?m)^description:\s*(.+)$').Groups[1].Value.Trim().Trim('"',"'")
    if(-not $name) { $name=Split-Path -Leaf (Split-Path -Parent $Path) }
    return @{name=$name;purpose=$desc}
}
function Classify([string]$Name) {
    switch -Regex ($Name) {
        'premise|concept|plot-structure|plot-narrative|storyboard|scene-craft|story-init|orchestrator|discovery' {return 'story planning'}
        'children|genre-craft' {return "children's writing; age adaptation"}
        'character|worldbuilding|voice-style' {return 'character bible; image consistency'}
        'continuity|series|plot-hole' {return 'story continuity; QA'}
        'line-edit|polisher|editorial|beta-reader|reader-panel|feedback|research' {return 'editing; QA'}
        'picture-book|adaptation|comic' {return 'picture-book creation; illustration prompting; image consistency'}
        'imagegen|cover' {return 'illustration prompting; image consistency'}
        'layout|documents|pdf|braille' {return 'book layout'}
        'publish|submission|wattpad' {return 'publishing'}
        'chapter-writing|novel-scene|verse|theme' {return 'story writing'}
        'pets|pet' {return 'optional unrelated mascot tools'}
        default {return 'general development'}
    }
}
$raw=& codex plugin list --json
if($LASTEXITCODE -ne 0){throw 'Codex plugin availability check failed'}
$plugins=($raw -join [Environment]::NewLine | ConvertFrom-Json).installed
$pluginRecords=@()
foreach($p in $plugins) {
    $cache=Join-Path $codexRoot "plugins/cache/$($p.marketplaceName)/$($p.name)/$($p.version)"
    $manifest=Join-Path $cache '.codex-plugin/plugin.json'
    $metadata=if(Test-Path $manifest){Get-Content -Raw $manifest|ConvertFrom-Json}else{$null}
    $purpose=if($metadata -and $metadata.PSObject.Properties.Name -contains 'description'){$metadata.description}else{'Provider connection/tools; see Codex Plugins catalog'}
    $repository=if($metadata -and $metadata.PSObject.Properties.Name -contains 'repository'){$metadata.repository}else{'Not published in installed metadata'}
    if($p.name -eq 'story-skills'){$repository='https://github.com/danjdewhurst/story-skills'}
    $pluginRecords+=@{name=$p.pluginId;version=$p.version;source=$repository;purpose=$purpose;installationMethod="Codex marketplace $($p.marketplaceName)";reinstall="codex plugin add $($p.pluginId)";available=$p.enabled;availabilityEvidence='codex plugin list --json installed/enabled';relevant=($p.name -ne 'work-pets');helps=(Classify $p.name);cachePath=$cache}
}
$pluginRecords | ConvertTo-Json -Depth 8 | Set-Content "$script:ProjectRoot/docs/plugins-inventory.json" -Encoding utf8
$paths=@()
foreach($searchRoot in @("$codexRoot/skills","$codexRoot/plugins/cache","$OriginalWorkspace/.agents/skills")) {
    if(Test-Path $searchRoot){$paths+=@(Get-ChildItem -Recurse -Force -File -Filter SKILL.md -LiteralPath $searchRoot)}
}
$skills=@()
foreach($file in $paths) {
    $meta=Read-SkillMetadata $file.FullName; $name=$meta.name; $group='system'; $version='bundled (not individually versioned)'
    $source='https://github.com/openai/skills'; $method='Bundled Codex system skill'; $reinstall='Install/update official Codex; bundled skill follows installed runtime'
    $vendor=$null; $plugin=$null
    if($file.FullName -match 'plugins[\\/]cache[\\/]([^\\/]+)[\\/]([^\\/]+)[\\/]([^\\/]+)[\\/]') {
        $market=$Matches[1];$group=$Matches[2];$version=$Matches[3]
        $plugin=@($pluginRecords | Where-Object {$_.name -eq "$group@$market"}) | Select-Object -First 1
        $source=if($plugin){$plugin.source}else{'Provider runtime cache; no public repository recorded'}
        $method="Codex plugin: $group@$market";$reinstall="codex plugin add $group@$market"
        if($group -eq 'story-skills'){$vendor="skills/vendor/story-skills/$name/SKILL.md"}
    } elseif($file.FullName -match 'picture-book-generator[\\/]SKILL.md$') {
        $group='picture-book-generator';$version='unversioned snapshot; SHA-256 pinned';$source='https://github.com/kangqiang1996-bot/picture-book-generator'
        $method='skill-installer helper from GitHub root';$reinstall='npx skills add https://github.com/kangqiang1996-bot/picture-book-generator --agent codex'
        $vendor='skills/vendor/picture-book-generator/SKILL.md'
    } elseif($file.FullName.StartsWith($OriginalWorkspace,[StringComparison]::OrdinalIgnoreCase)) {
        $group='fiction-book-agent-skills';$version='unversioned snapshot; source lock hashes retained';$source='https://github.com/lensetek/Fiction-book-agent-skills'
        $method='npx skills add (repo-scoped)';$reinstall='npx skills add https://github.com/lensetek/Fiction-book-agent-skills --agent codex'
        $vendor="skills/vendor/fiction-book-agent-skills/$name/SKILL.md"
    }
    $session=$sessionNames -contains $name
    $skills+=@{name=$name;group=$group;version=$version;source=$source;purpose=$meta.purpose;installationMethod=$method;reinstall=$reinstall;available=$session;availabilityEvidence=if($session){'Listed in initial session skill catalog; file read/hash verified'}else{'Detected on disk only; not exposed in this session catalog'};relevant=($name -notmatch '^(pets|create-pet|update-pet|review-agent)$');helps=(Classify $name);installedPath=$file.FullName;vendoredPath=$vendor;sha256=(Get-FileHash $file.FullName -Algorithm SHA256).Hash}
}
$inventory=@{date='2026-10-05';timezone='Africa/Cairo';skills=$skills;pluginCount=$pluginRecords.Count;physicalSkillCount=$skills.Count;sessionExposedCount=@($skills|Where-Object {$_.available}).Count;portableWritingSkillCount=@($skills|Where-Object {$_.vendoredPath}).Count}
$inventory | ConvertTo-Json -Depth 10 | Set-Content "$script:ProjectRoot/docs/skills-inventory.json" -Encoding utf8
$lines=[Collections.Generic.List[string]]::new()
$lines.Add('# Complete detected skills / plugins inventory')
$lines.Add('')
$lines.Add("Verified 2026-10-05: $($skills.Count) skill files; $($inventory.sessionExposedCount) session-exposed skills; $($pluginRecords.Count) installed/enabled plugins; $($inventory.portableWritingSkillCount) portable writing-skill snapshots.")
$lines.Add('')
$lines.Add('Session availability is grounded in the initial runtime catalog plus file verification. Cache-only skills are explicitly marked. Tool-only plugins need not expose SKILL.md. Authentication was verified for GitHub CLI and Google Drive only; enabled does not guarantee authorization for every other connector.')
$lines.Add('')
$lines.Add('Full untruncated purposes, source paths, hashes, reinstall commands and installation methods: skills-inventory.json and plugins-inventory.json. Exact upstream release identifiers are recorded only when known; unversioned skills use file hashes and offline snapshots, not an invented version.')
$lines.Add('')
$lines.Add('## Plugins')
$lines.Add('')
$lines.Add('| Exact name | Version | Source | Purpose / relevance | Reinstall | Available |')
$lines.Add('|---|---|---|---|---|---|')
foreach($p in $pluginRecords) { $purpose=($p.purpose -replace '\r?\n',' ' -replace '\|','/');if($purpose.Length -gt 180){$purpose=$purpose.Substring(0,180)+'…'}; $lines.Add("| $($p.name) | $($p.version) | $($p.source) | $purpose; relevant=$($p.relevant); $($p.helps) | $($p.reinstall) (requires configured marketplace/provider) | $($p.available) |") }
$lines.Add('')
$lines.Add('## Skills')
$lines.Add('')
$lines.Add('| Exact name | Group / version | Purpose / Hekayti usage | Available now | Source / installation / reinstall |')
$lines.Add('|---|---|---|---|---|')
foreach($s in $skills | Sort-Object group,name) { $purpose=($s.purpose -replace '\r?\n',' ' -replace '\|','/');if($purpose.Length -gt 180){$purpose=$purpose.Substring(0,180)+'…'}; $lines.Add("| $($s.name) | $($s.group) / $($s.version) | $purpose; $($s.helps); relevant=$($s.relevant) | $(if($s.available){'YES — runtime catalog'}else{'disk only'}) | $($s.source); $($s.installationMethod); $($s.reinstall) |") }
$lines.Add('')
$lines.Add('## Recovery / installation details')
$lines.Add('')
$lines.Add('story-skills marketplace: codex plugin marketplace add danjdewhurst/story-skills; codex plugin add story-skills@story-skills. Installed 0.21.0 verified by CLI and cache manifest. Windows originally checked out its root symlink as a file; use offline vendored skills if reinstall fails. Never modify working installed plugins just to refresh inventory.')
$lines.Add('Portable exact snapshots: bootstrap.ps1 -RestoreSkills copies missing skills without replacing existing ones. Plugin reinstall commands restore current provider versions, not necessarily the archived version; exact writing instructions are preserved in skills/vendor. Accounts and connector grants must be reauthorized separately.')
$lines.Add('Original Fiction-book-agent-skills source lock: docs/fiction-skills-source-lock.json. picture-book-generator upstream has no release version in the installed copy. No reinstall was performed during foundation.')
$lines | Set-Content "$script:ProjectRoot/docs/SKILLS_INVENTORY.md" -Encoding utf8
Write-Host "PASS inventory: $($skills.Count) skill files / $($inventory.sessionExposedCount) session exposed / $($pluginRecords.Count) plugins / $($inventory.portableWritingSkillCount) portable writing skills"
