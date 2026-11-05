# Roomloom: The Last Firefly

**A five-minute mixed-reality ritual where your real room shelters the last living lights.**

Roomloom is a hands-first Meta Quest game built for the 2026 Meta VR Start Developer Competition. The player looks at and pinches three light-creatures hidden around a tabletop garden. Every rescue visibly grows the garden; completing the round records a daily lightkeeping streak and promises a new species tomorrow.

## Why this can win

- **Passthrough has a job:** the player's room is the habitat, while the tabletop-height garden turns a familiar surface into the game's emotional center.
- **Immediate interaction:** one button, three large glowing targets, and a payoff in under two minutes.
- **Hands and gaze first:** every action works through Meta's hand-ray interaction model, with gaze-and-pinch enabled on supported devices; no controller-only path exists.
- **Return loop:** daily seeds, streaks, and future room-specific species turn a polished short session into a habit.
- **Accessibility by default:** stationary seated play, targets larger than their visual mesh, redundant color/text feedback, and a high-contrast mode.
- **Not a wrapper:** the procedural creatures, garden, progression, interaction, and rendering are all project-owned.

Primary category: **New Gaming Experience**. Special-award fit: **Best First Five Minutes**, **Best Reason to Come Back**, **Accessibility Forward**, and **Boldest Original Concept**.

## Run it

Requirements: Node.js 24+ and a modern browser. A Quest is optional for local development because IWSDK includes IWER, its browser-based XR emulator.

```sh
npm install
npm run typecheck
npm run dev
```

Open the managed Runtime view and enter XR. The round begins immediately: point at each firefly and select it. On Quest, the intended input is a hand ray plus pinch; gaze-and-pinch is enabled where eye tracking is available. The panel button starts a replay after completion.

```sh
npm run build
```

The deployable static build is written to `dist/`.

## MVP scope and next milestone

This MVP proves the complete game loop, visual growth, sound, accessibility toggle, and persisted daily streak. It requests hand tracking, gaze tracking, anchors, plane/mesh detection, and real-world hit testing through `iwsdk.config.json`.

The competition build should add a first-run placement gesture that confirms a detected table plane, persist the resulting spatial anchor, scatter lights against measured room planes, and add one new daily creature family. Those additions turn the authored tabletop pose used by this testable MVP into a room-adaptive experience while preserving its current interaction loop.
