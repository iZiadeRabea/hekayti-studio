#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$designRoot=Split-Path -Parent $PSScriptRoot
$designPassed=0
function Assert-Design([bool]$Condition,[string]$Message) {
    if(-not $Condition){ throw $Message }
    $script:designPassed++; Write-Host "PASS $Message"
}
try {
    $required=@(
        'docs/PHASE_1_INDEX.md',
        'docs/selected-skills.md',
        'docs/research/source-register.md',
        'docs/research/child-development.md',
        'docs/research/age-appropriateness.md',
        'docs/age-engine.md',
        'docs/story-engine/story-types.md',
        'docs/story-engine/story-blueprint.md',
        'docs/language/arabic-guidelines.md',
        'docs/language/egyptian-arabic-guidelines.md',
        'docs/language/english-guidelines.md',
        'docs/language/localization-engine.md',
        'docs/personalization/personalization-engine.md',
        'docs/personalization/character-bible.md',
        'docs/personalization/photo-safety.md',
        'docs/art/paper-cut-style-bible.md',
        'docs/art/illustration-pipeline.md',
        'docs/video/video-pipeline.md',
        'docs/books/page-layout-system.md',
        'docs/books/print-book-pipeline.md',
        'docs/books/digital-book-pipeline.md',
        'docs/product/creator-workflow.md',
        'docs/product/mvp-scope.md',
        'docs/architecture/application-modules.md',
        'docs/architecture/technical-architecture.md',
        'docs/architecture/data-model.md',
        'docs/qa/story-qa.md',
        'docs/qa/illustration-qa.md',
        'docs/qa/book-qa.md',
        'docs/ROADMAP.md'
    )
    foreach($relative in $required) {
        $path=Join-Path $designRoot $relative
        Assert-Design (Test-Path -LiteralPath $path) "design document exists: $relative"
        $body=Get-Content -Raw -LiteralPath $path
        Assert-Design ($body.Length -gt 500) "design document nonempty: $relative"
        foreach($link in [regex]::Matches($body,'\]\(([^)]+)\)')) {
            $target=$link.Groups[1].Value
            if($target -match '^(https?:|#)'){continue}
            $target=($target -split '#')[0]
            Assert-Design (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $path) $target)) "design local link: $relative -> $target"
        }
    }
    $files=@(Get-ChildItem -LiteralPath "$designRoot/examples/test-stories" -Filter '*.json' -File)
    Assert-Design ($files.Count -eq 3) 'three synthetic blueprint specifications'
    $expectedAges=@{ 'test-a-under-1'=8; 'test-b-1-to-2'=20; 'test-c-3-plus'=48 }
    foreach($file in $files) {
        $s=Get-Content -Raw -LiteralPath $file.FullName|ConvertFrom-Json
        foreach($field in @('schemaVersion','storyId','projectId','revisionId','workingTitle','ageMonths','ageBandId','ageProfileVersion','languageModes','primaryLanguageMode','primaryCategory','objective','theme','tone','readingMode','protagonistId','supportingCharacterIds','characterBibleRefs','personalization','setting','environmentBibleRef','meaningBeats','pagePlan','languageVersions','illustrationBrief','styleProfileRef','videoAdaptationNotes','outputIntents','safetyQualityChecks','approvalRecords','lineage','dependencyHashes')) {
            Assert-Design ($s.PSObject.Properties.Name -contains $field) "$($s.storyId): required contract field $field"
        }
        Assert-Design ($s.specificationOnly -and $s.profileOrigin -eq 'synthetic') "$($s.storyId): design-only synthetic"
        Assert-Design ($s.ageMonths -eq $expectedAges[$s.storyId]) "$($s.storyId): exact age"
        Assert-Design ($s.personalization.level -eq 0 -and $s.personalization.heroMode -eq 'none' -and $null -eq $s.personalization.privateProfileRef) "$($s.storyId): optional personalization not inferred"
        Assert-Design (@($s.approvalRecords).Count -eq 0 -and @($s.generatedAssets).Count -eq 0 -and @($s.exportRefs).Count -eq 0) "$($s.storyId): no unearned approvals or generated output"
        $pageIds=@($s.pagePlan|ForEach-Object {$_.pageId})
        $beatIds=@($s.meaningBeats|ForEach-Object {$_.beatId})
        Assert-Design (@($pageIds|Select-Object -Unique).Count -eq $pageIds.Count) "$($s.storyId): unique page IDs"
        Assert-Design (@($beatIds|Select-Object -Unique).Count -eq $beatIds.Count) "$($s.storyId): unique beat IDs"
        $pageOrder=1
        foreach($page in $s.pagePlan){
            Assert-Design ($page.order -eq $pageOrder) "$($s.storyId): contiguous page $pageOrder"
            $pageOrder++
            foreach($beatId in $page.beatIds){Assert-Design ($beatIds -contains $beatId) "$($s.storyId): page beat reference $beatId"}
        }
        $language=$s.languageVersions[0]
        Assert-Design ($language.sourceRevision -eq $s.revisionId) "$($s.storyId): edition bound to canonical revision"
        $sum=0
        foreach($page in $language.pages){
            $actual=@(($page.narration.Trim() -split '\s+')|Where-Object {$_ -match '[\p{L}\p{N}]'}).Count
            Assert-Design ($page.wordCount -eq $actual -and $pageIds -contains $page.pageId) "$($s.storyId): measured prose/reference $($page.pageId)"
            $sum+=$actual
        }
        Assert-Design ($sum -eq $language.totalWords) "$($s.storyId): total word count measured"
        Assert-Design ($sum -ge $s.testExpectations.storyWordRange[0] -and $sum -le $s.testExpectations.storyWordRange[1]) "$($s.storyId): provisional word budget"
        Assert-Design ($pageIds.Count -eq $s.testExpectations.storyPageCount -and @($language.pages).Count -eq $pageIds.Count) "$($s.storyId): edition page set"
        Assert-Design ($s.testExpectations.videoEligible -eq ($s.ageMonths -ge 24)) "$($s.storyId): screen-eligibility specification"
        if($s.ageMonths -lt 24){Assert-Design ($s.videoAdaptationNotes.childViewingEligibility -eq 'ineligible-child-viewing') "$($s.storyId): under-two viewing excluded"}
        $charIds=@($s.characterBibles|ForEach-Object {$_.characterId})
        foreach($ref in $s.characterBibleRefs){Assert-Design ($charIds -contains $ref.characterId) "$($s.storyId): bible reference resolves"}
        if($s.protagonistId){Assert-Design ($charIds -contains $s.protagonistId) "$($s.storyId): protagonist reference resolves"}
    }
    $sources=Get-Content -Raw "$designRoot/docs/research/source-register.md"
    Assert-Design ($sources -match '2026-10-05' -and $sources -match 'who.int' -and $sources -match 'cdc.gov' -and $sources -match 'unicef.org' -and $sources -match 'healthychildren.org') 'authoritative dated source register'
    Assert-Design ((Get-Content -Raw "$designRoot/docs/age-engine.md") -match 'D/H' -and (Get-Content -Raw "$designRoot/docs/personalization/photo-safety.md") -match 'NOT implemented') 'heuristics and privacy implementation limits explicit'
    Write-Host "PASS PRODUCT DESIGN TESTS — $designPassed assertions; document/fixture integrity, not implemented engine or production validation"
    exit 0
} catch {Write-Host "FAIL PRODUCT DESIGN TESTS: $_";exit 1}
