# Synthetic demo specifications
No real child/customer details, original photos or generated art. Arabic lines are proposed copy to make a blueprint reviewable, not final approved manuscripts.

| Test | Exact age / internal band | Goal / canonical structure | Story pages / proposed words | Expected video result |
|---|---|---|---|---|
| A | 8 months / 0-11m | early-learning; connection | 8 / 17 | ineligible-child-viewing |
| B | 20 months / 12-23m | behavioral; behavioral | 10 / 45 | ineligible-child-viewing |
| C | 48 months / 36-59m | adventure; emotional | 16 / 180 | eligible-with-caregiver |

[TEST A](test-a-under-1.json): under1, recognition/shared attention, no plot/child protagonist requirement.
[TEST B](test-b-1-to-2.json): 1–2, supported tidy-up routine, no shame or immediate behaviour-change claim.
[TEST C](test-c-3-plus.json): public3+ label refined to48m, bounded cooperative adventure/emotional goal, no dangerous search.

Each fixture carries stable page/beat/character IDs, primary edition, privacy defaults, pending human approvals and output intent. Same canonical plan will feed all eligible outputs; video intent does not override age gate. No provider calls or final illustrations.

Acceptance later: adapt these to Egyptian Arabic with matching beat/page meanings and separate native review; test age overrides/boundaries; change one prop and verify dependent art/layout marked stale. Assertions in tests/product-design.tests.ps1 check contract consistency, not content effectiveness.

Word count: whitespace tokens containing a letter/number; art briefs and parent matter excluded. Every JSON line is editorial draft, not a customer product or certification.
