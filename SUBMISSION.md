# Roomloom: The Last Firefly — Devpost submission copy

Single source of truth for everything pasted into the Devpost form. Keep the repo, the hosted build and the form in agreement.

**Deadline: November 18, 2026, 12:00:00 PM PT.** Do not modify the submission after the deadline. The hosted build must stay available until the Winner Announcement (on or around December 11, 2026).

> **Read before pasting.** Most of this file is finished copy. The public HTTPS URL is live and verified below. The remaining values cannot be produced from a repository — a real device video URL, the Representative's real name/email, and confirmation of the eligibility accounts. They are collected once in the **Owner inputs** table at the end. Every unresolved row there is a hard blocker: do not submit with an unresolved row. Nothing in this file claims a performance number or a hands-only result that has not been measured on a physical Quest.

---

## 1. Form fields

| Devpost field | Value |
| --- | --- |
| Project name | **Roomloom: The Last Firefly** |
| Short tagline | Rescue the last fireflies hiding in your room and grow a living tabletop garden, one five-minute ritual at a time. |
| Track | **Gaming** |
| Division | **New Experience** (all project code was created after September 24, 2026; the git history starts 2026-11-05) |
| Built with | Immersive Web SDK (IWSDK) 1.0.1, WebXR, TypeScript, Vite, Three.js (via `@iwsdk/core`) |
| Project link | **https://mimimoneydev.github.io/roomloom-the-last-firefly/** — public HTTPS GitHub Pages build produced by `.github/workflows/deploy.yml` (deploy run green, HTTPS enforced) |
| Video link | Public YouTube or Vimeo URL, under 3 minutes — see Owner inputs |

**Demo opening (for the video, recovered verbatim from the pre-deletion README):**

> Show a bare garden in passthrough, pinch one distant light, and cut immediately to the first luminous plant growing from the real table. Complete all three rescues before explaining the technology.

---

## 2. Description (paste into the Devpost "Description" field)

Roomloom: The Last Firefly is a seated, five-minute mixed-reality ritual in which your own room becomes the habitat for the last living lights. There is no pre-authored level. On a cold start the game refuses to play until it has found a real surface: you look at a clear table or wall, hold a pinch, and the garden is planted there. Detected planes and room meshes are then measured into resting places, and every flight a light takes is checked along its arc against the real geometry with a conservative 10 cm clearance envelope. A different room produces a different puzzle — two lantern branches, a chain, a one-to-three-light route, or resting places sheltering against a real wall. Turn passthrough off and there is no game to play.

**Inspiration.** Fireflies vanish from ordinary rooms as ordinary places. We wanted a game that could not exist on a flat screen and that asked nothing athletic of the player: no walking, no reaching, no standing, no controllers. The emotional target is a small nightly ritual — rescue three lights, watch a luminous plant grow out of your own table, and come back tomorrow to find the garden has remembered you.

**How it was built.** The experience is an IWSDK / WebXR app written in TypeScript, with procedural creatures, garden, resting places and lantern sockets generated in code and composed in `public/scenes/main.iwsdk.scene.json`. `iwsdk.config.json` requests hand tracking, gaze tracking, anchors, plane detection, mesh detection, hit-test, scene understanding and environment raycast; the runtime reports which of these were actually granted rather than silently degrading. `RoomPlacement` consumes WebXR hit-test results and persistent anchors; `SurfaceSamples` collects horizontal planes, vertical planes and mesh triangles and labels each sample with its semantic source (`table` / `plane` / `wall` / `mesh`); `planPuzzle()` turns those measured samples plus obstacle-clear flight arcs into the round's topology. Input sources are classified from `XRInputSource` (`hand`, `targetRayMode === 'gaze'`, `gamepad`), and `?hands=1` refuses controller-originated selections so a hands-only session can be proven from the exported telemetry. Near-poke (`PokeInteractable`) complements the hand ray; a pinch-and-hold confirms placement; gaze-and-pinch is tuned as a fallback on devices with eye tracking. Rendering adapts through three quality tiers when one-second FPS windows fall below 60, and the instrumented build records draw calls, triangles, geometries, textures, input provenance and the active tier. Positional audio is emitted from the light or garden that caused it, high-contrast mode recolours every text element and adds shape/label cues, a three-step diegetic tutorial teaches look → pinch → arrival, and a gentle score with a saved personal best ends each round with a non-punitive summary. Residents, streaks, milestones and contrast preference persist locally with defensive handling of denied or corrupt storage. The panel distance is computed from the camera's field of view so it fits narrower-FoV devices as well as Quest 3. There are no controller-only paths and no AI-generated assets in the experience.

**Future plans.** More room-authored puzzle topologies (chairs, shelves, corners), shared multi-user lightkeeping around one anchored garden, seasonal species and soundtrack, a comfort preset for photosensitivity, and a public release with a wider accessibility pass informed by field-test notes from unfamiliar players in unfamiliar rooms.

**Target launch date.** Q1 2027, targeted for March 2027, after the competition judging window. *(Proposed plan — confirm before submitting; see Owner inputs.)*

---

## 3. Hands-first / hand interactions (paste where the form asks about interactions)

Roomloom is **fully usable with hands end-to-end, with controllers physically unpaired**. Controller support is optional and never required.

| Action | Gesture |
| --- | --- |
| Enter and look around | Head movement; no input device needed. Seated throughout. |
| Start a room scan | Hand-ray point at the **Place in room** button and pinch; near-poke the panel button with a fingertip also works. |
| Find a surface | Look at a clear table, floor or wall while the scan runs. |
| Plant the garden | **Hold a pinch (~0.4 s)** on the garden preview. A stray tap cannot plant it; if released too early the game asks you to hold a little longer. |
| Select a light / resting place / lantern socket | Hand-ray point and pinch, or near-poke the glowing object. |
| On devices with eye tracking | Look at a target (gaze ray) and pinch — gaze-and-pinch fallback, tuned in `iwsdk.config.json` under `world.features.gaze`. Eye tracking is optional; the hand ray remains the primary path. |
| Lantern choice, undo, pause, high contrast, replay | Panel buttons via hand ray or near-poke. |
| Full loop | Place in room → hold a pinch → choose Lantern A or B → guide all three lights home → read the round summary → Play again. Completed with no controller input. |

`?hands=1` is an enforcement mode: controller-originated selections are refused and counted, and the saved report states whether `handsOnlySession` was proven across the whole session. `?test=1` records the input-source provenance, granted capabilities, frame timing, one-second FPS windows, draw calls, the active quality tier and the measured surface sources for every selection event.

---

## 4. Testing instructions (paste into the Devpost field)

1. Open the **public HTTPS project link** in **Quest Browser**. WebXR requires a secure context; `http://localhost` is not sufficient on device. Accept the certificate prompt only for the local dev URL when developing.
2. Allow **hand tracking** and **scene / space permissions** when Quest Browser asks. Unpair controllers for a hands-only run. Stay seated; no room-scale boundary or walking is needed.
3. On launch the game shows **"Waiting for a real surface"**. Choose **Place in room**, look slowly at a clear table or wall until the garden preview appears, then **hold a pinch** to plant it. If the scan finds no verified route, the game says so and asks you to look at a clear table or wall — it does not silently switch to a floating puzzle.
4. The guided tutorial takes you through **look → pinch → arrival**. Press **Skip guide** or **Replay guide** if preferred.
5. When the room produces two branches, choose **Lantern A** or **Lantern B** and select a light to try its route. **Undo move** is always free. Then guide all three lights home; the round ends with a score, personal best, residents, streak and tomorrow's species.
6. **High contrast** switches every text element, buttons and cards to a near-black / near-white palette with larger type and shape prefixes. **Pause** freezes flights. **Play again** restarts.
7. **Preview (no room)** is an explicitly labelled, opt-in, non-mixed-reality demo for permission-denied devices. It is not the competition experience and is never the default state.
8. For instrumented field tests open `https://mimimoneydev.github.io/roomloom-the-last-firefly/?test=1&hands=1`, play the full loop, press **Save test report**, exit immersive mode and open `https://mimimoneydev.github.io/roomloom-the-last-firefly/test-report.html` on the same origin and browser profile. The report page adds device, participant code, room description, route topology and the observed-scenario checklist, then **Download measurements and notes**. The exported JSON is the evidence artifact.
9. Verification commands for the source: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`. See `README.md` and `REMEDIATION.md` for the full device-side field-test protocol.

---

## 5. Team

**Solo developer**, repository author `mimimoneydev` (`mimimoneydev@users.noreply.github.com` is the git identity, not a contact address). All code, procedural assets, audio cues, UI, telemetry and documentation in this repository are project-owned.

The Devpost **Representative must be the Meta VR Start Program member**. Enter that person's real name and contact email in the form and in the Owner inputs table below. If additional people contributed, list each name, email and role; do not leave the team field blank.

---

## 6. Video and screenshots

**Video (required, < 3:00, public on YouTube or Vimeo).** Shot list, all captured on a physical Quest in passthrough with controllers unpaired and no AI-generated footage:

| Time | Shot |
| --- | --- |
| 0:00–0:12 | Bare real room, garden preview, story beat: "the last living lights". |
| 0:12–0:35 | Hands only: point, hold a pinch, garden lands on a real table — the table becomes the habitat. |
| 0:35–1:25 | First rescue, luminous plant growth, Lantern A/B choice, a second rescue. |
| 1:25–2:05 | **Cut to a different room** where the geometry produces a different puzzle layout. This is the single most important Technical Implementation and Experience Design evidence. |
| 2:05–2:45 | Round completion: score, residents, streak, garden milestone, tomorrow's species. |
| 2:45–2:55 | End card: public URL and "hands-only, seated, five minutes". |

Lead with the story, not the technology. English audio or English subtitles.

**Screenshots to attach (4–6, all real-device captures):** hero garden on a real table; hands-only pinch; second-room puzzle with a visibly different topology; completion / garden milestone; high-contrast mode. The `artifacts/*.png` files in this repo are **emulator art-direction renders, not device screenshots** — they may be supplementary, but must never be presented as Quest captures.

---

## 7. Changelog

- **2026-11-05** — Initial commit: procedural fireflies, garden, resting places, panel UI, daily sanctuary persistence.
- **2026-11-06** — Competition rules/judging assessment; `REMEDIATION.md` work plan written.
- **2026-11-07** — Competition build: input-source provenance and `?hands=1` enforcement, granted-capability reporting, pinch-and-hold placement, near-poke interactables, gaze tuning, blocking room scan on cold start with no playable floating default, opt-in labelled preview, vertical-plane / wall sampling and surface-source telemetry, positional audio from emitting entities plus an ambient bed, FoV-aware panel distance, draw-call instrumentation and adaptive quality tiers, full high-contrast UI, three-step guided onboarding, gentle score / personal best / round summary. Scene validated with IWSDK's scene renderer; runtime console clean; 32 unit tests, typecheck and build green. GitHub Pages deployment workflow added; unused IWSDK starter modules removed.

---

## 8. Claims policy

Do **not** claim 60 fps, hands-only certification, or "tested on Quest" until a physical-device field-test JSON in `artifacts/room-evidence/` supports it. Emulator (IWER) results are application-level evidence only and must be labelled as such. When device evidence exists, state the device, room, minimum one-second FPS, draw calls and `handsOnlySession` explicitly, and replace the pending-device section in `README.md` with a results table.

---

## 9. Owner inputs — hard blockers before submitting

Rows 2–9 cannot be generated from the repository. Supply each one, then remove its row. Row 1 (the public URL) is resolved; only its **Quest Browser** check remains on hardware.

| # | Owner input | Why it blocks | Status |
| --- | --- | --- | --- |
| 1 | **SUPPLIED** — `https://mimimoneydev.github.io/roomloom-the-last-firefly/`. Pages enabled with the GitHub Actions source, deploy run green, HTTPS enforced, `index.html` / scene / UI / audio / test-report all return HTTP 200, headless Chromium loads the app with 0 console errors and 0 failed requests | Still open: verify it opens in **Quest Browser** on a physical headset | URL DONE / DEVICE CHECK PENDING |
| 2 | Public YouTube/Vimeo video URL, < 3:00, real hands-only Quest capture in two rooms | Missing video is an explicit disqualification trigger | NOT SUPPLIED |
| 3 | Representative's real name, email and team roster (solo or named members) | Team info is a required form field | NOT SUPPLIED |
| 4 | Confirm target launch date in §2 | Required description topic; the current value is a proposed plan | PROPOSED — CONFIRM |
| 5 | Confirm Meta account with Developer Access **and** Meta VR Start Program membership by submission, plus Devpost "Join Hackathon" | Both eligibility gates are cumulative | NOT CONFIRMED |
| 6 | Five physical-Quest field-test JSONs with `handsOnlySession: true`, ten scenarios each, min one-second FPS ≥ 60, differing route topologies | Judging evidence for hands-first, 60 fps and room dependence | NOT SUPPLIED |
| 7 | 4–6 real-device screenshots | Expected presentation materials | NOT SUPPLIED |
| 8 | FoV screenshots for `metaQuest3` and `metaVRGlasses` emulator profiles | Technical Implementation / FoV-aware design evidence | NOT SUPPLIED |
| 9 | Confirm all code is post–September 24, 2026, otherwise switch Division to **Adapted / Significantly Updated Gaming** | Wrong Division risks disqualification | PROBABLE — CONFIRM |

---

## 10. Devpost field mapping checklist

- [ ] Title = Roomloom: The Last Firefly
- [ ] Tagline (verify character limit on the live form)
- [ ] Description = §2 (inspiration, how built, future plans, target launch date all present)
- [ ] Project link = `https://mimimoneydev.github.io/roomloom-the-last-firefly/` (paste into the form)
- [ ] Video URL (Owner input 2)
- [ ] Track = Gaming; Division = New Experience (or Adapted, per Owner input 9)
- [ ] Screenshots = 4–6 real-device images
- [ ] Testing instructions = §4
- [ ] Hands-first / hand interactions = §3
- [ ] Changelog = §7
- [ ] Team = §5 plus real names/emails
- [ ] Target launch date stated in both the description and the form
- [ ] English for all text, screenshots and video (or English subtitles)
- [ ] Form saved **before** Nov 18, 2026, 12:00 PM PT, then left untouched
