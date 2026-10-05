# Optional Personalization Engine
D specification. Level0 is default. Personalization level and protagonist choice are separate fields; level4 photo-reference does NOT force heroMode.

| Level | Meaning / data minimum | Role / gate |
|---|---|---|
| 0 | Fictional stock characters only | No ChildProfile; default |
| 1 | Approved display name only, e.g. dedication | Not automatically hero; real name private even when public-looking |
| 2 | Name + approved safe preferences | Favourite colour/object; no school/address/birthday required |
| 3 | Child explicitly chosen protagonist | Consent and approved fictional portrayal; name/preferences without photo possible |
| 4 | Guardian-supplied photo reference for illustrated character | Separate consent/provider/privacy gates; role can be protagonist, cameo or dedication portrait |

Role values none/dedication/cameo/protagonist; level3 requires protagonist, all others require explicit selection. A name-only protagonist is possible by explicitly choosing level3 rather than inferring it. Photo level4 captures higher sensitivity, not automatic story centrality.

Collect approved display name, ageMonths, optional safe preferences and guardian consent reference only when needed; keep private profile outside repository. Don't request legal name, biometric match, school, address or identity documents as story inputs. Never infer ethnicity, diagnosis, temperament or worth from photos; no face recognition/embeddings.

Flow: select level → explain data use → verify adult authority/consent workflow → sanitized Character Bible candidate → guardian approves portrayal → editor reviews relevance → lock bible version. Customer may choose no personalization; no penalty in story quality. Consent withdrawal pauses new generation/delivery and triggers retention workflow, not a promise to erase already printed copies.

Private-to-public boundary: runtime renders temporary references into necessary provider payload only after consent/provider review; do not write filled private prompts or child names into Git, source backups or diagnostic logs. Character consistency is aesthetic, not guaranteed identity fidelity.

MVP can deliver level0–3 only after their private storage/consent/export controls pass. Photo level4 held for later gated implementation. Synthetic examples always profileOrigin=synthetic, not real records with renamed fields.
