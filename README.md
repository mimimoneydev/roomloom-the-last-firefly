# Roomloom: The Last Firefly

**Rescue the last fireflies hiding in your room and grow a living tabletop garden, one five-minute ritual at a time.**

Roomloom is a hands-first, seated mixed-reality game built with the Immersive Web SDK (IWSDK) for the 2026 Meta VR Start Developer Competition. XR means an immersive session; IWER is IWSDK's browser-based XR emulator. The player guides three light-creatures home along routes authored by their own room — real tables, planes, walls and meshes — not by a pre-authored level. Daily rescues permanently add residents and garden milestones; each completed round ends with a gentle score, a personal best and a consecutive-day lightkeeping streak. Lumen fireflies and moon moths alternate by local calendar date.

## Submission

- **Tagline:** Rescue the last fireflies hiding in your room and grow a living tabletop garden, one five-minute ritual at a time.
- **Demo opening:** Show a bare garden in passthrough, pinch one distant light, and cut immediately to the first luminous plant growing from the real table. Complete all three rescues before explaining the technology.
- **Track / Division:** Gaming / New Experience. Highest prize: $100,000 Best New Gaming Experience. Rules limit an Entry to one prize, so special awards do not stack.
- **Submission copy:** [`SUBMISSION.md`](SUBMISSION.md) is the single source of truth for every Devpost field (description, hands-interaction notes, testing instructions, team, video shot list, changelog and the remaining owner-supplied values).
- **Work plan and status:** [`REMEDIATION.md`](REMEDIATION.md) orders the remaining eligibility, device-evidence and polish work as P0 → P1 → P2.

## Why this can win

- **Passthrough has a job:** a cold start refuses to play until a real surface is found. The room's planes and meshes become the puzzle topology, and every flight is checked against real geometry. There is no playable floating default that behaves the same with passthrough off.
- **Hands first, end-to-end:** hand-ray point and pinch, near-poke, and a pinch-and-hold placement confirm; gaze-and-pinch is a tuned fallback where eye tracking exists. `?hands=1` refuses controller-originated selections, and telemetry records input-source provenance so a hands-only session can be proven rather than asserted.
- **Immediate interaction:** one pinch to offer the first light a home, a payoff in under two minutes, and a three-step diegetic tutorial (look → pinch → arrival) that teaches without controller terminology.
- **Holds up in untested rooms:** horizontal planes, vertical walls, mesh triangles and obstacle-checked arcs produce branch, chain and one-to-three-light routes with different *solutions*, not just different positions. Surface sources (`table` / `plane` / `wall` / `mesh`) are recorded in the field-test report.
- **Return loop:** saved residents, score, personal best, garden milestones, tomorrow's species and a daily streak reward coming back.
- **Accessibility and comfort by default:** stationary seated play, targets larger than their visual mesh, a full high-contrast UI with shape/label cues and larger type, generous target sizes, no fail state, and a panel distance derived from the camera's field of view.
- **Not a wrapper:** the procedural creatures, garden, progression, room reasoning, interaction, telemetry and rendering are project-owned.

## Run it

Requirements: Node.js 24+ and a modern browser. A Quest is optional for local development because IWSDK includes IWER, its browser-based XR emulator. `iwsdk.config.json` — not `vite.config.ts` — is the project authority for the active scene, assets, components and XR features.

```sh
npm ci
npm run typecheck
npm test
npm run dev
```

`npm run dev` starts the CLI-managed dev server and a managed browser at `https://localhost:8081/`. Open the managed Runtime view and enter XR (an immersive session). See [Testing Your Experience](https://iwsdk.dev/guides/02-testing-experience.html) for IWER and headset testing. To open the same build on a headset on the same Wi-Fi network, use the network URL from `npm run dev:status` and accept the expected local certificate warning.

```sh
npm run build
npm run preview
```

The deployable static build is written to `dist/`; `vite.config.ts` sets `base: './'` so it also works under a GitHub Pages subpath.

## Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds `dist/` from a clean `npm ci`, runs typecheck and tests, and publishes to GitHub Pages on every push to `main` (also available as a manual workflow run). `actions/configure-pages@v5` with `enablement: true` turns on Pages and sets the **GitHub Actions** source automatically; if your organisation blocks that API, do it once manually under **Settings → Pages → Build and deployment → Source**. WebXR requires a secure context; Pages serves over HTTPS. Keep the public URL live and unchanged until the Winner Announcement (on or around December 11, 2026).

## Play and return

- **Cold start is a room scan**, not a level. The panel reads "Waiting for a real surface". Choose **Place in room**, look at a clear table, floor or wall until the garden preview appears, then **hold a pinch** (~0.4 s) to plant it. A short tap cannot plant the garden. If hit-test or scene understanding is unavailable, the game says so explicitly.
- **Preview (no room)** is an explicitly labelled, opt-in `PREVIEW ONLY` demo for permission-denied devices. It never starts automatically and is not the mixed-reality experience.
- Measured samples come from horizontal planes, vertical walls and room meshes, each labelled with its semantic source. `planPuzzle()` derives the round's resting places and lantern sockets from those samples and from verified clear flight arcs, so a different room produces a different solution: two lantern branches, a chain, or a one-to-three-light route. If no verified route exists, the game asks you to look at a clear table or wall and place again.
- **Lantern A / B** chooses a branch; select a light to try its route; **Undo move** is free and moves are disabled while a light is flying. Every measured flight is checked along its animated arc against a snapshot of available room meshes and planes with a conservative 10 cm clearance envelope. Missing, untracked or oversized geometry never counts as a verified clear path. Unscanned objects or furniture moved after placement are not detected: re-place the garden to rescan. Plane-only coverage is less complete than a detailed room mesh. See [IWSDK scene understanding](https://iwsdk.dev/guides/11-scene-understanding.html).
- A short guided tutorial teaches **look → pinch → arrival**; **Skip guide** and **Replay guide** are available. Waiting too long only dims a light's glow — it recovers as soon as you act, and there is no fail state. The round ends with a score (fewer hops, moves and undos, faster completion), a saved personal best, residents, streak and tomorrow's species.
- **High contrast** recolours every text element, buttons and card to a near-black / near-white palette, adds larger type and redundant shape prefixes. **Pause** freezes flights. Browser interruptions, session interruptions and tracking loss suspend interaction; recovery resumes the journey.
- Positional audio cues are emitted from the light, socket or garden that caused them (the cue entity is moved to the source's world position before playback), with a soft non-positional ambient bed. Frame time, one-second FPS windows, draw calls, triangles, geometries, textures and the active adaptive-quality tier are recorded in the instrumented build; the renderer steps down through three tiers if two consecutive one-second windows fall below 60 fps, without disabling any interaction. In immersive XR the compositor owns framebuffer scale, so pixel-ratio tuning applies only outside XR.
- The panel repositions after a sustained large head turn, and its distance is computed from `PerspectiveCamera.fov` so it also fits narrower-FoV devices. Capability reporting checks which WebXR features were actually *granted*, and shows a panel line when a required capability is missing instead of silently degrading.
- Completed rescues are saved immediately in local browser storage. Replaying the same daily slot does not farm residents. One resident welcomes a companion; three awaken a flower; six grow a grove; nine transform the garden. Returning restores residents, flowers, discoveries, best score and the next objective. The first three residents are fireflies; later rounds alternate creature families by local date, with slower, fluttering moth journeys.
- A WebXR anchor preserves garden placement when the device/browser supports persistent handles. Saved residents are independent of anchors: failed spatial restoration still preserves the sanctuary. Storage refusal is shown explicitly as session-only progress. Garden progress and high-contrast preference are local to this browser profile; clearing browser storage removes them. Persistent anchors are local to a device/browser profile, not cloud or shared-room anchors.
- `RoomloomSystem` is the only application system registered in `src/index.ts`. It owns the game loop and delegates surface/anchor lifecycle work to `RoomPlacement`. ECS (entity-component system) queries drive all interaction; Three.js is imported from `@iwsdk/core`, never from `three` directly.

## Verification

```sh
npm run typecheck
npm test                 # 32 unit tests across tests/roomloom.test.mjs and tests/competition.test.mjs
npm run build
./node_modules/.bin/iwsdk scene render-file \
  --input-json '{"path":"public/scenes/main.iwsdk.scene.json","view":"quarter","width":384,"height":384}'
git status --short      # must be clean before submission
```

The scene renderer validates `public/scenes/main.iwsdk.scene.json` (including the `PokeInteractable` components and audio fields) and returns `diagnostics: []`. With the managed browser running, `iwsdk browser logs` should show no errors and `iwsdk ecs systems` should list `RoomloomSystem`, `GazeSystem` and `InputSystem` with 10 ray and 10 poke interactables. Tests cover date boundaries, corrupted/denied storage, persistent milestones, relay choices and undo, obstacle-blocked flights, measured versus preview puzzles, vertical-plane samples, input provenance, hands-only enforcement, FoV distance, quality tiers, contrast palettes, tutorial progression, score and capability reporting.

These are emulator and unit-test results. They are **not** hardware performance or hands-only certification.

## Physical field tests — pending

No physical Quest results have been recorded yet, so this repository makes no claim of 60 fps or hands-only certification on hardware. `SUBMISSION.md` lists every remaining device- and account-dependent blocker; `REMEDIATION.md` tracks their status.

Use the hosted build with **`?test=1&hands=1`** on a physical Quest with controllers physically unpaired. `?test=1` enables measurement; `&hands=1` refuses controller selections and records `handsOnlySession`. A test-only **Save test report** control records frame timing, one-second FPS samples, draw calls, triangles, geometries, textures, the active quality tier, granted capabilities, input-source provenance, surface sources and timestamped interaction events. Measurements exclude paused/hidden periods and long suspension gaps; they are application frame-delivery measurements, not GPU profiling. The report never claims the device is physical on its own.

After saving, leave immersive mode and open `test-report.html` on the same origin and browser profile. Add the device, participant code (T1–T5), room description, route topology, FoV profile, pass/fail/pending results and hesitation notes; download the JSON into `artifacts/room-evidence/`. No notes or room coordinates are uploaded; reports stay in local storage (last ten sessions).

For five unfamiliar testers, use independent clean browser profiles and provide no coaching. Test launch, hands-only placement, pinch-and-hold, near-poke, gaze-and-pinch, both lantern choices, undo, completion, restart, contrast, guided onboarding, denied room permissions, tracking recovery, pause/interruption, reopening with residents restored, and a second unfamiliar room with a different route. Cover small tables, narrow seated spaces and unfamiliar rooms. Record actual physical-device FPS and failures rather than filling unobserved cases as passes. When those results exist, replace this section with a results table (device, room, hands-only pass, min one-second FPS, draw calls, failures).
