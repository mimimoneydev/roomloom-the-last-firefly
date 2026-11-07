# Roomloom: The Last Firefly — Remediation Instructions

Purpose: turn the current working tree into an eligible, $100K-competitive **Gaming / New Experience** entry.
Deadline: **November 18, 2026, 12:00:00 PM PT**. Build must stay available until the Winner Announcement (**on or around December 11, 2026**). **Do not modify the submission after the deadline** — post-deadline edits can disqualify.

These are **instructions to execute**, not a report. Work them in priority order. Every P0 item is a pass/fail eligibility gate; P1 items move the four 25% scores; P2 items add polish.

---

## Implementation status — 2026-11-07

Legend: **DONE** = implemented and verified in the repo; **CODE DONE / DEVICE PENDING** = shipping code and unit tests exist, but the competition claim still needs physical-Quest evidence; **OPEN** = cannot be produced from this repository (account, device, video, or owner decision).

### P1 / P2 code — DONE

| Plan item | Implementation | Verification |
| --- | --- | --- |
| P1-1 input provenance, hands-only mode, granted-capability report | `src/roomloom-input.ts` (new), `src/roomloom-telemetry.ts` (version 2 reports), `src/roomloom.ts` (`connectSession()`, selection gating), `?hands=1` in `public/test-report.html` | `tests/competition.test.mjs`: classification, unique source counts, `handsOnlySession`, enforcement, missing-capability report |
| P1-1 explicit hand interactions | `PokeInteractable` on 10 scene entities, pinch-and-hold (`RoomPlacement.HOLD_MS = 400` with `selectstart`/`selectend`), gaze tuning in `iwsdk.config.json` `world.features.gaze` | `iwsdk scene render-file` → `diagnostics: []`; `iwsdk ecs find --input-json '{"withComponents":["PokeInteractable"]}'` → 10 entities; `iwsdk ecs systems` → `GazeSystem` config keys match the gaze options, `InputSystem` 10 ray / 10 poke interactables |
| P1-2 60 fps instrumentation and adaptive quality | `src/roomloom-performance.ts` (new): 3 quality tiers, FoV distance, low-FPS windows; `RoomloomSystem.applyQuality()`; renderer `info.render.calls/triangles`, `memory.geometries/textures` into telemetry; `public/test-report.html` summary | unit tests for tiers, FoV clamp, low windows; build/typecheck green |
| P1-3 passthrough indispensable | Default state `placement: 'scanning'` / `routeMode: 'scanning'`; `restorePreview()` no longer the entry state; `planPuzzle()` returns a blocking `measured: false` plan instead of `practicePuzzle()`; `practicePuzzle()` is opt-in and labelled `PREVIEW ONLY`; vertical-plane/wall sampling and `sources[]` in `src/roomloom-surfaces.ts` / `src/roomloom-puzzle.ts` | unit tests: no practice fallback, wall-authored topology, distinct measured routes; runtime shows "Waiting for a real surface" |
| P1-3 FoV-aware panel | `fovPanelDistance(this.world.camera.fov)` in `RoomloomSystem.recenterPanel()` | unit tests; `metaVRGlasses` screenshot still pending |
| P2-1 positional audio | `RoomloomSystem.cue()` moves the shared cue entity to the emitting source's world position before `AudioUtils.play()`; `distanceModel`/`refDistance`/`rolloffFactor` on sound entities; new non-positional `ambient.wav` loop | scene validator accepted all audio fields; device panning check pending |
| P2-1 high-contrast UI | `src/roomloom-presentation.ts` (new): `contrastPalette()`, `contrastButtonColor()`, `contrastCardColor()`, `contrastEmissive()`; ids added to `public/ui/roomloom.uikitml`; `refresh()` applies all | unit tests assert every text id receives a value in both modes, prefixes differ, font sizes grow |
| P2-1 guided onboarding | `advanceTutorial()` / `tutorialCopy()` state machine, `TutorialButton` (Skip / Replay guide), `tutorialStep` in `RoomloomState` | unit tests for progression, skip, replay |
| P2-1 score and soft stakes | `computeScore()`, `scoreGrade()`, `updateBestScore()`, `roundSummary()`; `bestScore`/`bestGrade` persisted in `src/roomloom-sanctuary.ts`; non-punitive dimming after 20 s | unit tests for score ordering, best-score replay, corrupt storage |
| P2-2 presentation copy | `SUBMISSION.md` (full Devpost copy, video shot list, changelog, claims policy, owner-input blockers); `README.md` rewritten with restored tagline and demo opening | reviewed against the code and the rules |

### P0 — DONE in the repo

- `SUBMISSION.md` created; the tagline and demo opening are restored in `README.md` under **Submission**. Owner-supplied values are isolated in §9 of `SUBMISSION.md`; none are fabricated.
- Dead IWSDK starter modules `src/robot.ts`, `src/panel.ts`, `src/robot-component.ts` removed with `git rm` (no references anywhere in the repo).
- `.github/workflows/deploy.yml` added: clean `npm ci`, typecheck, tests, `npm run build`, `dist/.nojekyll`, GitHub Pages artifact and deploy, triggered on push to `main` and manually. `vite.config.ts` already sets `base: './'`.
- All working-tree changes are committed in the competition-build commit (verify with `git log -1`); `git status --short` is clean apart from any later device evidence you add.

### Verified locally on 2026-11-07

```
npm run typecheck                       # exit 0
npm test                                # 32 tests pass (20 original + 12 new)
npm run build                           # exit 0; non-fatal >500 kB chunk warning
iwsdk scene render-file ... quarter     # ok: true, diagnostics: [], valid scene
iwsdk scene render-file ... front       # ok: true, diagnostics: []
iwsdk browser reload + browser logs     # 0 errors / 0 warnings
iwsdk ecs systems                       # 16 systems; RoomloomSystem, GazeSystem, InputSystem active
```

### Still OPEN — none of these can be completed from this repo

1. **Clean reinstall**: `npm ci` is still blocked locally by the sandbox bulk-delete guard (`[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]`, 62 targets in `node_modules/@dimforge`). The current install is complete enough for typecheck/tests/build to pass; the deploy workflow performs a clean `npm ci` on a fresh CI runner, which is the authoritative clean-install proof. Run it once locally in an unrestricted shell before the final submission if you want a second confirmation.
2. **Public HTTPS URL**: enable Pages (Settings → Pages → Source = GitHub Actions), push `main`, wait for the workflow, then verify the URL in Quest Browser. Keep it live until ~Dec 11.
3. **<3 min real-capture video** and **4–6 real-device screenshots** — physical Quest, hands only, two rooms, no AI-generated footage.
4. **Five physical-Quest field-test JSONs** — `handsOnlySession: true`, ten scenarios each, min one-second FPS ≥ 60, draw calls, different route topologies. Until these exist, no 60 fps or hands-only hardware claim may appear in `SUBMISSION.md` or the Devpost form.
5. **FoV screenshots** for `metaQuest3` and `metaVRGlasses` (switch `iwsdk.config.json` `dev.emulator.device` between runs).
6. **Eligibility gates** — Meta account with Developer Access **and** Meta VR Start membership **and** Devpost "Join Hackathon", all confirmed before Nov 18. New Experience Division must be re-confirmed (all code post–Sep 24, 2026) or switch to Adapted.
7. **README** "Physical field tests — pending" section may only be replaced with a results table after item 4 exists.
8. **Known risk — first-load weight**: `npm run build` emits a 6.6 MB minified JS chunk (1.7 MB gzip) plus two ~0.45 MB workers; Vite warns that some chunks exceed 500 kB. Runtime FPS is unaffected, but cold-start time on Quest Browser should be measured during the field tests. If it is slow, split with `build.rollupOptions.output.manualChunks` or dynamic `import()` before submission; do not change the bundle after the deadline.

---

## 0. Ground rules — read before touching code

1. **Target**: Best New Gaming Experience, $100,000 (1 winner). Rules say "Limit one (1) prize per Entry", so the $25K special awards cannot be stacked.
2. **Stage One is pass/fail**: the entry must reasonably fit the theme and reasonably apply the required tools/features. Incomplete Devpost materials, a missing IWSDK/WebXR link, a missing video, or **failing hands-first** are explicit disqualification triggers. Stage One failure means the four criteria are never scored.
3. **Stage Two criteria, each 25%**: Innovation & Creativity · Experience Design · Technical Implementation · Polish & Presentation.
4. **Non-negotiable competition requirements** (Rules §4.4, §4.6):
   - "Fully usable with hands end-to-end. Controller support optional." Gaming track is "hands-first (required) or eyes and hands … seated, without controllers."
   - Min **60 fps** on Meta Quest hardware; "solid and bug-free".
   - For passthrough: "the player's real room should meaningfully change the experience … rather than a scene that plays identically with passthrough off"; "correct use of scene understanding (MRUK), anchoring content to detected planes, surfaces, and room geometry, and holding up in rooms the developer never tested."
   - Clear onboarding; FoV-aware design across devices.
   - Video: "show real gameplay that honestly represents the experience. Lead with the story … Don't lean on AI-generated video to carry the pitch."
5. **Required Devpost items**: project link (a public GitHub Pages / Vercel / equivalent URL for IWSDK entries), a **<3 minute** video publicly visible on **YouTube or Vimeo** showing the project on a Meta Quest device or XR Simulator/emulator, a text description covering **inspiration, how you built it, future plans, and a target launch date**, **Track** selection, **Division** selection. Screenshots, changelogs, testing instructions, and English materials are expected/highly recommended.
6. **Eligibility (both required, cumulative)**: active Meta account with Developer Access **and** Meta VR Start Program membership by the time of submission, plus a Devpost account. Start membership applies to the person submitting; the Meta developer account applies to all entrants.
7. **Division**: keep **New Experience** only if all code is post–September 24, 2026 ("No pre-existing codebases, no shipped titles, no early access builds repurposed"). The current git history starts 2026-11-05, so New Experience is defensible. If any code predates Sep 24, switch to **Adapted / Significantly Updated Gaming** — same $100K ceiling.
8. **Follow repository conventions**: `AGENTS.md`, `src/AGENTS.md`, `public/ui/AGENTS.md`, `public/scenes/AGENTS.md`, and the `.claude/rules`, `.cursor/rules`, `.github/instructions` files. Notably: `iwsdk.config.json` is the project authority (not `vite.config.ts`), import Three.js from `@iwsdk/core` never `three`, components must be declared in `src/components.ts`, static geometry lives in TypeScript while composition lives in scene JSON, UIKitML sizes are centimetres and `setProperties()` is the runtime API.

### Environment blocker — current state (updated 2026-11-07)

The earlier partial-install failure is resolved for the working install: `npm run typecheck`, `npm test` (32 tests) and `npm run build` all exit 0, and `iwsdk scene render-file` validates the scene with zero diagnostics. A **clean** `npm ci` still cannot run in this sandbox because the bulk-delete guard aborts it (`[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]`). The authoritative clean-install proof is therefore the CI job in `.github/workflows/deploy.yml`, which runs `npm ci` on a fresh runner before typecheck, tests and build. If you have an unrestricted shell, also run locally:

```sh
npm ci --no-audit --no-fund
npm run typecheck && npm test && npm run build
```

Do **not** claim typecheck, tests, or build pass on a clean install until all three actually exit 0 there. The `dist/` build alone is not proof.

---

## P0-1 — Restore the submission copy, tagline, description and team info

**Problem**: `3a5c7f0` ("Remove submission copy from README") deleted the tagline and demo opening. There is no tagline, description, team info, or submission draft anywhere in the repo. This alone is a Stage One fail.

**Recover the deleted copy verbatim:**

```sh
git show 2b24c5e:README.md | sed -n '38,46p'
```

Recovered text to reuse (edit, don't retype from memory):

- **Tagline**: `Rescue the last fireflies hiding in your room and grow a living tabletop garden, one five-minute ritual at a time.`
- **Demo opening**: `Show a bare garden in passthrough, pinch one distant light, and cut immediately to the first luminous plant growing from the real table. Complete all three rescues before explaining the technology.`

**Instructions:**

1. Create `SUBMISSION.md` at the repo root (single source of truth for everything pasted into Devpost). It must contain these sections, fully written out, not placeholders:
   - Project name, short tagline (verify it fits the live Devpost field), Track = `Gaming`, Division = `New Experience`.
   - **Description** covering the four required topics: inspiration; how it was built (IWSDK/WebXR, procedural creatures and garden, WebXR hit-test + plane/mesh detection, obstacle-checked flight arcs, persistent anchors, local persistence); future plans; **target launch date** `[FILL: real date]`. Keep it concise and lead with what makes it distinct.
   - **Hands-first / hand-interactions description**: exact gestures for every action (hand-ray point + pinch, near-poke, gaze-and-pinch fallback), and an explicit statement that the full loop works end-to-end with controllers unpaired.
   - **Testing instructions**: the public URL, "requires HTTPS / Quest Browser", "allow hand tracking and scene/space permissions", steps for Place in room → pinch to confirm → lantern A/B → guide lights home → Play again, `?test=1` for field telemetry, and how to open `test-report.html`.
   - **Team**: `[FILL: each member's name, email, role]`; Representative must be the Meta VR Start member. If solo, say so explicitly.
   - **Target launch date**, **screenshots list**, and a short changelog.
2. Put the tagline and demo opening back into `README.md` (e.g. under a `## Submission` heading) so the repo and Devpost agree.
3. Add a `SUBMISSION.md` → Devpost mapping checklist so nothing is omitted: project link, video URL, description, Track, Division, screenshots, testing instructions, team, launch date.
4. Confirm Start membership + Developer Access + Devpost "Join Hackathon" registration are done **before** Nov 18, not on the deadline day.

**Status (2026-11-07)**: `SUBMISSION.md` and the `README.md` **Submission** section are written. All copy that can be derived from the repo is complete. The values that cannot be derived (live public URL, video URL, real names/emails, launch date confirmation, eligibility confirmations, device evidence and screenshots) are collected as explicit blockers in `SUBMISSION.md` §9 — **Owner inputs** — rather than being invented or left as `[FILL]` tokens inside the copy. The proposed target launch date (Q1 2027 / March 2027) is labelled as a plan to confirm.

**Acceptance**: `SUBMISSION.md` has no `[FILL]` placeholders left; every Rules §4.6 item has a corresponding value; all nine owner-input blockers resolved; the Devpost form is complete and saved before the deadline.

---

## P0-2 — Commit the real build and remove dead starter modules

**Problem**: HEAD `3a5c7f0` is only a 182-line MVP. The entire advanced build is uncommitted/untracked: `src/roomloom-placement.ts`, `-puzzle.ts`, `-surfaces.ts`, `-obstacles.ts`, `-routes.ts`, `-sanctuary.ts`, `-progress.ts`, `-telemetry.ts`, `src/scene-assets/resting-place.scene-asset.ts`, `tests/`, `public/test-report.html`, `public/audio/*.wav`, `artifacts/*.json` and images, plus modifications to 11 files. A clone gives judges the MVP. `src/robot.ts`, `src/panel.ts`, `src/robot-component.ts` are unused IWSDK starter leftovers.

**Instructions:**

1. `git add -A && git commit -m "Ship competition build: room-adaptive placement, relay puzzle, persistence, telemetry, tests"`. Then `git push origin main`. Verify with `git status --short` (clean) and a fresh `git clone` to a temp dir — `src/roomloom.ts` is the full ~796-line competition system, not the 182-line MVP at HEAD `3a5c7f0`. (Done locally; the push is the remaining step.)
2. Delete `src/robot.ts`, `src/panel.ts`, `src/robot-component.ts`. A reference grep confirms nothing imports them. Then remove the sentence about them in `README.md:57` ("The robot/panel starter modules are unregistered and unused.") — it becomes false.
3. Re-run `npm run typecheck && npm test && npm run build` after deletion to prove nothing depended on them.
4. Add deployment. Either:
   - `.github/workflows/deploy.yml` publishing `dist/` to GitHub Pages on push to `main` (Meta's IWSDK guide documents this path), or
   - a Vercel/Netlify project pointing at the repo with build command `npm run build`, output `dist`.
   `vite.config.ts` already sets `base: './'`, which is correct for a GitHub Pages subpath. WebXR requires a **secure context** — the URL must be HTTPS; verify the certificate.
5. Deploy, then open the public URL **in Quest Browser** and confirm the immersive-AR session starts, permissions are granted, and the loop completes. Keep that URL live and unchanged until ~Dec 11.

**Acceptance**: clean `git status`, clean clone contains the full build, no dead starter modules, public HTTPS URL opens in Quest Browser, deployment reproducible from the workflow.

---

## P0-3 — Produce the <3 minute real-capture demo video

**Problem**: no video file, no YouTube/Vimeo link, no screenshots staged for the form.

**Instructions:**

1. Capture on a **physical Quest 3 in passthrough with controllers unpaired**. Real gameplay only; no AI-generated footage, no emulator-only capture presented as hardware.
2. Follow the recovered demo opening. Shot list:
   - 0:00–0:12 bare real room + garden preview; story beat ("the last living lights").
   - 0:12–0:35 hands only: point, pinch to place the garden on a real table; show the plane/table becoming the habitat.
   - 0:35–1:25 first rescue → luminous plant growth; lantern A/B choice; a second rescue.
   - 1:25–2:05 **cut to a different room** where the geometry produces a different puzzle layout (this is the single most important Technical Implementation + Experience Design evidence).
   - 2:05–2:45 round completion, residents/streak/garden milestone, tomorrow's species — show the return loop.
   - 2:45–2:55 end card with the public URL and "hands-only, seated, five minutes".
3. Keep it under 3 minutes (judges are not required to watch beyond 3), public/unlisted-visible on YouTube or Vimeo, English (or English subtitles), and paste the URL into `SUBMISSION.md` + Devpost.
4. Export 4–6 device screenshots from the same capture and attach them to Devpost.

**Acceptance**: public video URL loads, is <3:00, shows hands-only real-device gameplay in two different rooms, and contains no synthetic footage.

---

## P1-1 — Prove and enforce hands-first, gaze and real-device use

**What is actually true today (important nuance)**: `iwsdk.config.json` sets `handTracking`, `gazeTracking`, `anchors`, `planeDetection`, `meshDetection`, `hitTest` to `true` and `world.features.sceneUnderstanding` / `environmentRaycast` to `true`. These are **not inert**: IWSDK registers `GazeSystem` when `gazeTracking` is granted (surfacing an `XRInputSource` with `targetRayMode === 'gaze'`), and requests the WebXR hand-tracking / plane / mesh / hit-test session features. The gap is that **Roomloom never reads or proves any of it**: `src/roomloom.ts:12-18` queries only generic `Pressed` / `Hovered` tags from pointer events; `src/roomloom-placement.ts` and `src/roomloom-surfaces.ts` do genuinely consume `detectedPlanes` / `detectedMeshes` / hit-test / anchors, but no code classifies input source type, no code gates on hands-only, and all recorded evidence is IWER emulator with `artifacts/room-route-verification.json` stating `"IWER Quest 3, controller-right remote selections"`. `README.md:49` admits "No physical Quest or hosted deployment was available."

**Instructions:**

1. **Input provenance in `src/roomloom-telemetry.ts`**: `frame()` currently increments `hands`/`controllers` once per frame per source, so `handsObserved`/`controllersObserved` are just "> 0" and cannot prove a hands-only session. Replace with a `Set` keyed by input source (`handedness` + `targetRayMode` + presence of `gamepad`) and record:
   - `handSourcesSeen`, `controllerSourcesSeen`, `gazeSourcesSeen` as distinct counts/flags,
   - `handsOnlySession` = hands > 0 && controllers === 0 across the whole session,
   - the pointer mode that committed each `rescue-start` / `placement` event (extend `PlaytestRecorder.event()` to accept the source type, pass it from `RoomloomSystem`).
   Classify with `source.hand`, `source.targetRayMode === 'gaze'`, and `source.gamepad` on `session.inputSources` (all standard WebXR fields, already used in this file).
2. **Capability probe in `src/roomloom.ts` / `connectSession()`**: on session start, log whether hand tracking, gaze, planes, meshes, hit-test and anchors were actually granted (not merely requested). Surface a short panel line if a required capability is missing, instead of silently degrading. Optionally use `XRInputManager.isPrimary('hand'|'controller', 'left'|'right')` / `getPrimaryInputSource()` from `@iwsdk/xr-input` (re-exported by `@iwsdk/core`) to attribute selections.
3. **Explicit hand interactions, not just pointer tags**:
   - Add `PokeInteractable` (exported by `@iwsdk/core`) to resting places and lantern sockets in `public/scenes/main.iwsdk.scene.json` so near-poke works in addition to hand-ray.
   - Add a **pinch-and-hold** gesture for the placement confirm (currently any `select` event sets `confirm = true` in `RoomPlacement.select`) — require a sustained pinch (~0.4 s) so a stray pinch cannot plant the garden. Reflect it in the diegetic prompt.
   - Add an **eyes-only / gaze-and-pinch fallback**: tune `world.features.gaze` in `iwsdk.config.json` using the verified `ProjectGazeOptions` keys (`coneAngle`, `maxRayLength`, `dwellWindowSeconds`, `filterMinCutoff`, `filterBeta`, `suppressWhenDirectPointerActive`, `pointerTransformFollowsHand`, `trackingLossGraceSeconds`, `logDiagnostics`, `showDebugReticle`). Document that eye tracking is only available on supported hardware and degrade gracefully to hand ray.
4. **Hands-only test mode**: add a `?hands=1` mode that refuses controller-originated selections and reports `handsOnlySession` in the saved report. Use it for every field-test session and include the exported JSON in `artifacts/` (one file per tester, anonymised T1–T5).
5. **Real-device field tests** — use the existing `public/test-report.html` and `?test=1` pipeline already documented in `README.md:51-55`. Controllers physically unpaired. Run the full ten-scenario list (launch/permissions, room placement, lantern choice and undo, completion, restart, contrast, permission refusal, tracking recovery, pause/interruption, reopen with residents) with **five unfamiliar testers** in **unfamiliar rooms** (small tables, narrow seated spaces). Record actual FPS and failures; never mark unobserved cases as passes.
6. **Fix `README.md:49`** only after these runs exist: replace "No physical Quest or hosted deployment was available" with a results table (device, room, hands-only pass, min FPS, failures). Remove the "Physical field tests — pending" heading. Keep the honest warning that emulator results are not hardware certification for any remaining emulator-only claims.

**Acceptance**: at least five exported field-test JSONs from physical Quest showing `handsOnlySession: true`, a public hosted URL, and README/Devpost text that no longer says hardware was unavailable.

---

## P1-2 — Establish and hold 60 fps on Quest

**Problem**: `src/roomloom-telemetry.ts` measures `averageFps`, `minimumOneSecondFps`, `secondsBelow60` — but nothing in the codebase optimizes frame time, and no physical-device measurement exists. Judging: "High-scoring entries must be performant on Meta Quest hardware (min 60 fps)".

**Instructions:**

1. **Instrument more than frame delivery**: in `RoomloomSystem`, read `this.world.renderer` (public `WebGLRenderer` on `World`, verified) and record `renderer.info.render.calls`, `triangles`, `geometries`, `textures` alongside the existing one-second FPS buckets in `PlaytestRecorder`. Add these to `save()` and to `test-report.html`'s summary so a device report shows draw calls, not just frame pacing. Keep the existing caveat that this is application frame delivery, not GPU profiling.
2. **Remove obvious per-frame waste in `src/roomloom.ts` `update()`**:
   - Cache the results of `getObjectByName('HeartSeed')`, `'MothWingsLeft'`, `'MothWingsRight'`, `'Wing_L'`, `'Wing_R'`, `Growth_1..3` once in `init()`; currently they are looked up by string on every frame for every firefly (lines ~197, 223-228, 356-357).
   - Cache the resting-place / socket / resident entity lists instead of re-iterating queries each frame; only recompute transforms when `anchorMatrix` changes.
   - `init()` clones every mesh material of every interactable (lines 87-95) — keep the clone (needed for per-entity tinting) but stop re-traversing all meshes in `refresh()` on every state change; tint only the affected entity.
   - Avoid `new` allocations inside `update()`; reuse the existing `Vector3` scratch fields.
3. **Adaptive quality**: when `minimumOneSecondFps` falls below 60 for two consecutive one-second windows, step down one quality tier (reduce renderer pixel ratio, disable the least important animated meshes/emissive pulses, cap residents rendered) and record the tier change as a telemetry event. Never drop below a playable state; keep all interactions functional. Add the active tier to the saved report.
4. **Measure on hardware** in at least five rooms using `?test=1`, including the busiest scene (nine residents, all growth stages, both wings animating). Export the JSONs. Target: `secondsBelow60 === 0` during active play, with any dips documented and fixed.
5. **Do not** claim 60 fps in `SUBMISSION.md` unless a physical-device report supports it. State the measured device and min one-second FPS explicitly.

**Acceptance**: five physical-device reports with min one-second FPS ≥ 60 and draw-call counts; optimizations that keep `npm test` green.

---

## P1-3 — Make passthrough indispensable; remove the identical-without-passthrough path

**Problem**: `src/roomloom-puzzle.ts:35` returns `practicePuzzle()` whenever `planPuzzle()` finds no verified route, producing `"No verified clear room route. Floating practice puzzle."` — a fully playable floating puzzle that works with passthrough off. `restorePreview()` (`src/roomloom.ts:386-395`) deliberately starts every session in this practice mode with a fixed authored pose at `(0, .72, -1.32)`. Judging explicitly penalises "a scene that plays identically with passthrough off" and requires "holding up in rooms the developer never tested".

**Instructions:**

1. **Change the cold-start path**: the first-run flow must be `Place in room` → confirm a detected horizontal surface → collect planes/meshes → build the puzzle from measured samples. Do **not** call `restorePreview()` as the default entry state. If no verified surface exists, show a blocking, actionable scan prompt ("Look at a clear table or floor") rather than a playable floating round.
2. **Demote `practicePuzzle()`** to an explicitly labelled, opt-in **"Preview / no-room demo"** reachable only from a settings-style button, clearly marked as not the room experience, and never the state a judge sees on launch. Consider removing it from `planPuzzle()`'s return path entirely; return a `measured: false` plan with `reason` and let `RoomPlacement` retry the scan instead.
3. **Make the room genuinely author the puzzle**: `planPuzzle()` already derives points/sockets from `SurfaceSamples` and obstacle-clear flight arcs (`src/roomloom-surfaces.ts`, `src/roomloom-obstacles.ts`, 10 cm clearance). Strengthen it:
   - Use `plane.orientation === 'vertical'` planes and `frame.detectedMeshes` wall triangles to host content (e.g., lights sheltering against a real wall), not just horizontal sample points. Read `semanticLabel` where the runtime exposes it, but always fail closed if absent.
   - Record which semantic source produced each resting place in telemetry (`plane`/`mesh`/`wall`/`table`) so a report proves room dependence.
   - Ensure the room's topology changes the *solution*, not only the positions: different rooms should yield branch-vs-chain-vs-1-to-3-light routes (unit tests in `tests/roomloom.test.mjs` already cover these cases — extend them for vertical-plane placement).
4. **Prove it in untested rooms**: capture the same session in ≥5 rooms the developer never authored, exporting `surfaceCount`, `routeMode`, `reason`, and a screenshot per room. Put these in `artifacts/room-evidence/` and reference them in `SUBMISSION.md` and the video.
5. **Keep the honest failure mode**: if scene understanding is denied or unavailable, say so explicitly and offer a clearly labelled non-competitive preview — do not silently present it as the MR experience. `README.md:41` already documents rescan limitations; keep and extend that.
6. **FoV-aware design** (part of Technical Implementation): `recenterPanel()` uses a fixed 1.8 m distance and a 400-unit panel. Read `this.world.camera.fov` (a `PerspectiveCamera` on `World`) and scale panel distance/size to keep the whole panel within the usable field of view. Verify with the IWER emulator device profiles `metaQuest3` **and** `metaVRGlasses` (both are valid `ProjectEmulatorDevice` values); adjust `iwsdk.config.json` `dev.emulator.device` between runs and capture screenshots for both.

**Acceptance**: no playable floating puzzle on the default path; default requires a confirmed detected surface; ≥5 unfamiliar-room reports with different route topologies; FoV screenshots for two device profiles.

---

## P2-1 — Close the polish gaps

All four items below feed **Experience Design** and **Polish & Presentation**.

### a) Positional / spatial audio

`AudioSource` in `@iwsdk/core` defaults `positional: true` with `refDistance`, `rolloffFactor`, `maxDistance`, `distanceModel` and cone settings — but the four `sound-*` entities in `public/scenes/main.iwsdk.scene.json:407-459` have **no `transform`**, so their Object3D sits at world origin. `RoomloomSystem.cue()` (`src/roomloom.ts:310-312`) plays them by cue name, so every chime arrives from the origin regardless of which light, socket or garden triggered it.

**Instructions**:
- Preferred: attach `AudioSource` + `RoomloomSound` to the entity that emits the sound (fireflies, resting places, lantern sockets, garden heart) and call `AudioUtils.play(entity)` on that entity. The three firefly entities already carry `AudioSource` (`chime.mp3`) at lines ~106, 139, 172 — wire them up.
- Alternative: keep the shared cue entities but set a world position before playback, or use the verified one-shot API `AudioUtils.createOneShot(this.world, src, { positional: true, position: { x, y, z } })` with the triggering light's world position (apply `anchorMatrix` first).
- Set `refDistance`/`rolloffFactor`/`distanceModel` per cue so a distant light is audibly distant and arrival chimes bloom near the garden. Add a soft ambient bed with `loop: true`, `positional: false`.
- Verify on device: pan left/right and confirm the sound moves with the source; document in the field-test notes.

### b) High-contrast mode across all UI text

`src/roomloom.ts:102-106` toggles a single state flag; `refresh()` (line 328) only recolours `ProgressCard`'s background and (lines 338-341) firefly emissive colours. The UIKitML classes `.eyebrow` (`#255d49`), `.title` (`#173c31`), `.story` (`#35594c`), `.small` (`#35594c`) in `public/ui/roomloom.uikitml:2-11` are dark green and never change; `.progress` and `.hint` are also hardcoded.

**Instructions**:
- Add high-contrast variants for every text class and for `ProgressCard`, `RelayActions` buttons and `RelayText`. Apply them in `refresh()` via `setProperties({ backgroundColor, color })` on each element (`ProgressText`, `HintText`, `StoryText`, `GardenText`, `SpeciesText`, `PlacementText`, `RelayText`, `TestText`, and the static title div — give it an `id` first). `public/ui/AGENTS.md` confirms `setProperties` updates both text and style.
- Use near-black / near-white pairs, not the current palette; add a large-text step (increase `font-size`) and redundant shape/label cues so the mode is not colour-only. Keep the target sizes generous (UIKitML units are centimetres; targets larger than their visual mesh).
- Add a unit/integration test asserting that every text element receives a contrast value when `highContrast` flips, and capture before/after device screenshots.

### c) Guided onboarding in the first minute

Currently one intro line: `refresh()` line 320 sets `storyText` and line 325 sets `hintText` to "Point at the lone light and pinch. No need to reach or stand." and UIKitML line 16/19 has another static line. There is no teaching loop.

**Instructions**:
- Add a `tutorialStep` field to `RoomloomState` (`src/roomloom-component.ts`) and persist `introDone` as already available in `Sanctuary`.
- Build a three-step **diegetic** tutorial inside the existing first-light moment: (1) look at the light — highlight it, no input required; (2) pinch it — require a real hand pinch, show a hand-ray visual/affordance and confirm with a distinct chime; (3) watch it fly home and see the garden grow — then reveal the remaining lights. Each step has one short sentence, a visual cue, and no controller terminology.
- Gate advancement on the actual interaction (not a timer), allow skip/replay, and keep it under 60 seconds. Record each step in telemetry so the five field-test reports show whether unfamiliar testers completed onboarding without coaching.
- Replace the static UIKitML intro lines with dynamic text driven by `refresh()` so there is one source of truth.
- Add tests for step progression, skip, and persistence across a reload.

### d) Game depth: score, soft stakes, round summary

The round is three rescues with no fail state and no score (`src/roomloom.ts:289-296` just sets `COMPLETE` and a streak). Judging rewards "quality of design, mechanics, and user journey" and "a rewarding, habit-forming purpose".

**Instructions**:
- Add a gentle score: fewer flight hops, fewer lantern moves/undos, and faster completion yield a higher "lightkeeping" grade. `routeHops` and `routeStep` already exist in `RoomloomState`; add `moves`, `elapsed`, `score`, `bestScore`.
- Persist `bestScore` in `Sanctuary` (`src/roomloom-sanctuary.ts`) with the same defensive parsing used for `residents`/`days`, and add tests for corrupt storage and replay-not-farming.
- Add a **non-punitive** stake instead of a hard fail: e.g., a light's glow dims if it waits too long, recoverable by guiding it home; always winnable while seated, with an eyes-only/no-timer accessibility alternative. Never introduce a fail state that could exclude limited-mobility players.
- Show a round summary card at completion (score, best, residents, streak, tomorrow's species) and include it in the video's return-loop beat. Keep the whole session ≤10 minutes.

---

## P2-2 — Presentation assets

- Stage device screenshots for Devpost: hero (garden on a real table), hands-only pinch, second-room puzzle, completion/garden milestone, high-contrast mode.
- Reuse the existing `artifacts/*.png` renders only as supplementary art-direction evidence; Devpost should lead with **real-device** images.
- Make sure all submission text, screenshots and video are in English (or provide English translation/subtitles).

---

## Final acceptance checklist (state as of 2026-11-07)

**Done in the repository**

- [x] `npm run typecheck`, `npm test` (**32 tests**), `npm run build` all exit 0; `iwsdk scene render-file` returns zero diagnostics; runtime console has no errors. Clean `npm ci` on a fresh runner is performed by CI because the local sandbox blocks bulk deletion.
- [x] All working-tree changes committed; dead starter modules gone; full build (not the 182-line MVP) is in the commit. A fresh clone/typecheck check is still worth repeating after the push.
- [x] Deployment workflow added (`.github/workflows/deploy.yml`), reproducible from `main`, HTTPS via GitHub Pages.
- [x] `SUBMISSION.md` complete copy: tagline, description (inspiration / how built / future plans / target launch date), hands-interactions description, testing instructions, team, Track, Division, video shot list, screenshots list, changelog and claims policy. Owner inputs are listed as blockers rather than invented values.
- [x] Default path requires a confirmed detected surface; no playable floating puzzle on cold start; room planes, walls and meshes change the solution; surface sources recorded in telemetry.
- [x] Explicit hand/gaze interactions (pinch-and-hold, near-poke, gaze-and-pinch fallback) implemented and documented; `?hands=1` enforcement and input provenance in telemetry.
- [x] Positional audio, full high-contrast UI, guided onboarding, score + soft stakes + round summary, adaptive quality tiers, FoV-derived panel distance.

**OPEN — device, account and owner inputs (the remaining gap to the $100K prize)**

- [ ] `git push origin main`; public HTTPS URL live, opens in Quest Browser, stays up until ~Dec 11.
- [ ] Meta account with Developer Access + Meta VR Start membership + Devpost registration confirmed; Division verified as New Experience (all code post–Sep 24, 2026) or switched to Adapted.
- [ ] <3 min public YouTube/Vimeo video of real hands-only Quest gameplay in two different rooms; no AI-generated footage.
- [ ] Five physical-Quest field-test JSONs: hands-only from launch to completion, ten scenarios each, min one-second FPS ≥ 60, draw calls, different route topologies per room.
- [ ] `README.md` "Physical field tests — pending" section replaced with real results; no emulator result presented as hardware performance.
- [ ] FoV panel sizing verified on `metaQuest3` **and** `metaVRGlasses` emulator profiles, with screenshots.
- [ ] All nine rows in `SUBMISSION.md` §9 (Owner inputs) resolved before pasting into Devpost.
- [ ] **Nothing modified on Devpost after Nov 18, 2026, 12:00 PM PT.**

---

## Verification commands (run in this order)

```sh
npm run typecheck
npm test
npm run build
npm run preview                                  # sanity-check dist/ in a browser
./node_modules/.bin/iwsdk scene render-file \
  --input-json '{"path":"public/scenes/main.iwsdk.scene.json","view":"quarter","width":384,"height":384}'
git status --short                               # must be clean
```

On an unrestricted shell, prepend a clean `npm ci --no-audit --no-fund` (the CI workflow already does this on every push). The deleted submission copy no longer needs recovering — it is restored verbatim in `README.md` → **Submission** and in `SUBMISSION.md`.

Device-side: open `<public-url>?test=1&hands=1`, play hands-only with controllers unpaired, tap **Save test report**, exit immersive mode, open `<public-url>/test-report.html`, fill device = Physical Quest 3, participant T1–T5, room description, route topology, FoV profile and the observed scenarios, then **Download measurements and notes**. Store the JSONs under `artifacts/room-evidence/`.

---

## Do not do

- Do not claim the emulator is a physical Quest, or claim 60 fps without a device report.
- Do not invent owner-supplied values (video URL, public URL, real names, eligibility confirmations) to make `SUBMISSION.md` look complete; an untrue Stage One answer risks disqualification.
- Do not claim a clean local `npm ci` succeeded while the sandbox bulk-delete guard blocks it; the CI job is the clean-install proof until it is run in an unrestricted shell.
- Do not use AI-generated video to carry the pitch.
- Do not leave a controller-only path or a playable passthrough-independent default.
- Do not modify the Devpost submission after the deadline.
- Do not assume the $25K special awards stack with the $100K prize — "Limit one (1) prize per Entry".
