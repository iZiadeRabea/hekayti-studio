# Character Bible contract
One versioned bible per recurring character; approval locks visual identity, later changes become explicit progressions rather than overwriting opening state.

## Required fields

characterId; bibleVersion; role; origin (synthetic/stock/private-personalized); displayName (private for real child); approximate age range; species; silhouette/body proportions; hair style/colour; skin palette; non-biometric facial traits; eye/mouth design; intended anatomy/access needs; fixed clothing with colour/material; accessory inventory; approved expression range; personality/voice notes; doNotChange list; styleProfileVersion; approval status.

Optional: guardian-approved reference asset IDs, illustrated reference sheet asset ID and pose/view variants, pronunciation, comfort preferences. No original private photo URL in tracked examples. Neutral description supplied/approved by guardian; never infer sensitive attributes from reference.

## State / continuity

Opening outfit and prop ownership, allowed transformations with beatId/fromPageId, allowed poses and visible limb/occlusion notes, scene scale relative to others, local light variation vs fixed base colours. Missing accessory can be intentional only if recorded transition explains it. Disabled/animal characters follow intended design; blanket “two hands” check must not erase disability or species.

References: approved front/side/three-quarter illustrated views where useful. Every page binds exact bible and reference hashes. Provider seed alone is not an identity lock. Human checks repeated hairline/outline/clothing/proportions rather than unsupported face-similarity claims.

## Synthetic example lock

char-pip / v1: fictional paper bird, rounded oval blue body, cream belly, two small wings, short triangular ochre beak, dot black eyes, red paper neckerchief; no hands; neckerchief fixed. Guardian photo fields empty. Expressions clear and non-uncanny. Real-person bibles live in private workspace only.

Approval records include reviewer role, timestamp, version/hash and allowed changes. Keep generic reusable style separate from personal traits so a global style update does not silently re-identify an approved child.
