# Video Story pipeline
Approved story → approved illustrations → shot plan → scene animation → approved narration → sound → assembly → QA → human-approved final video. No whole long movie from a single prompt. Eligible outputs determined by age-appropriateness.md; under-two child-viewing disabled.

## Shot contract (D)

shotId, sourceRevision, beatIds/pageIds, approved image/layer refs and hashes, in/out timing, narration segment, camera/motion plan, subtitle text/times/locale, transition, SFX/music refs/licences, approval and dependency state. One shot can pan within a page; several shots may derive from one page without inventing events. Maintain canonical emotional sequence and educational goal.

First MVP video: predictable illustration-based pan/zoom/parallax with narration, not expensive generative character motion. Optional future AI animation per short shot isolated behind provider port, never required to deliver initial video. A flat image cannot reveal hidden background during parallax; generate/approve layers or use safe small motion, no stretching artifacts.

## Timing / audio (D, tune by read-aloud)

Start around 5–12 seconds for a simple shot, 10–20 for a longer narrated action; hold longer for natural speech/pause, never chop narration to a rigid quota. Total runtime = measured approved narration + intentional pauses/transitions; provisional older-child target 1–4 minutes for pilot. Not a clinical safe duration or attention limit. Slow gentle movement, no flashing rapid cuts, no surprise volume spikes, no infinite loops.

Warm native narration of selected edition; speaker/pronunciation approved, no default English rate for Arabic. Record audio segment revision/time alignment. No voice cloning of a real child/caregiver in V1. Silence for page-based interactions possible; keep caregiver prompts separate unless explicitly in video edition.

Music low relative to speech, optional; licensed SFX only, never assume streaming/commercial rights. Store source/rights metadata and manual audition. No synthetic voice pronouncing uncertain real names without approval. Narration change invalidates timings/captions/assembly.

## Captions / delivery

Arabic captions logical-order RTL, bidi-isolated numerals, tested connected letters/diacritics/line breaks. Don't reverse code points. Font licence/embedding follows book rules; subtitle renderer shaping verified in Phase8. Provide a tested caption route (burned-in for predictable device playback; optional UTF-8 sidecar). English edition LTR. Caption track must match spoken mode and timing; never assume every player handles RTL identically.

Provisional delivery H.264/AAC MP4 at1080p plus original masters, exact codec/build/licences checked before bundling. Audio channels/sample rates/levels verified against delivery profile, no universal loudness promise. Aspect ratios separately approved; reframe, do not auto-crop faces/text.

FFmpeg candidate for deterministic assembly; build/licence review gate. [FFmpeg licence](https://www.ffmpeg.org/legal.html). No FFmpeg installed or video produced in this phase.

QA: shot completeness, provenance, motion bounds, native audio, music rights, caption accuracy, final finite ending and human full playback. Provide pause-friendly co-viewing guidance, never “educational babysitter” marketing.
