# Phase 3 canonical pipeline

Strict StoryRequest → supplied Age structure → component-based ConceptSet → advisory evaluation → owner selection → `buildStoryBlueprint` → blank language placeholders → independent language drafting → QA and human review.

The builder accepts only concepts from the matching request revision with the same objective/category. Blueprint/1.1 carries synthetic levels 0–3; legacy 1.0 retains its original level-0 restriction. Level 4 and private markers are rejected. Canonical beats, bible refs and page coverage stay stable; `planStoryPages` maps all beats in order, distributing a long outline or repeating a recognition unit when pages exceed beats. IDs derive deterministically from request/revision/generation namespaces.

Placeholders have draft status, zero actual words and an explicit not-drafted/not-approved review. No approval, illustration or export is fabricated. Language revisions refer to the target blueprint revision. Existing 0.1/1.0 fixtures are unchanged. Public runtime schemas use `@hekayti/contracts/story` without a root runtime export cycle.
