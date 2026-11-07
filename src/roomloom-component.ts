import { createComponent, Types } from '@iwsdk/core';

export const RoomloomState = createComponent('RoomloomState', {
  phase: { type: Types.Int8, default: 0 },
  found: { type: Types.Int8, default: 0 },
  total: { type: Types.Int8, default: 3 },
  complete: { type: Types.Boolean, default: false },
  highContrast: { type: Types.Boolean, default: false },
  placement: { type: Types.String, default: 'scanning' },
  species: { type: Types.String, default: 'firefly' },
  streak: { type: Types.Int32, default: 0 },
  surfaceCount: { type: Types.Int8, default: 0 },
  surfaceSources: { type: Types.String, default: '' },
  routeMode: { type: Types.String, default: 'scanning' },
  routeStep: { type: Types.Int8, default: 0 },
  routeOrder: { type: Types.String, default: '' },
  routeHops: { type: Types.Int8, default: 0 },
  relayChoice: { type: Types.Int8, default: -1 },
  residents: { type: Types.Int32, default: 0 },
  gardenStage: { type: Types.Int8, default: 0 },
  paused: { type: Types.Boolean, default: false },
  tutorialStep: { type: Types.Int8, default: 0 },
  moves: { type: Types.Int32, default: 0 },
  undos: { type: Types.Int32, default: 0 },
  elapsed: { type: Types.Float32, default: 0 },
  score: { type: Types.Int32, default: 0 },
  bestScore: { type: Types.Int32, default: 0 },
  qualityTier: { type: Types.String, default: 'full' },
  capabilities: { type: Types.String, default: '' },
});

export const Firefly = createComponent('Firefly', {
  index: { type: Types.Int8, default: 0 },
  captured: { type: Types.Boolean, default: false },
  flight: { type: Types.Float32, default: -1 },
  originY: { type: Types.Float32, default: 1 },
  home: { type: Types.Vec3, default: [0, 0, 0] },
});

export const RestingPlace = createComponent('RestingPlace', {
  index: { type: Types.Int8, default: 0 },
  home: { type: Types.Vec3, default: [0, 0, 0] },
  status: { type: Types.String, default: 'waiting' },
});

export const RelaySocket = createComponent('RelaySocket', {
  index: { type: Types.Int8, default: 0 },
  home: { type: Types.Vec3, default: [0, 0, 0] },
});
export const GardenResident = createComponent('GardenResident', {
  index: { type: Types.Int8, default: 0 },
});
export const RoomloomSound = createComponent('RoomloomSound', {
  cue: { type: Types.String, default: 'attention' },
});
