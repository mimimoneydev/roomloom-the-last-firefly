import { createComponent, Types } from '@iwsdk/core';

export const RoomloomState = createComponent('RoomloomState', {
  phase: { type: Types.Int8, default: 0 },
  found: { type: Types.Int8, default: 0 },
  total: { type: Types.Int8, default: 3 },
  complete: { type: Types.Boolean, default: false },
  highContrast: { type: Types.Boolean, default: false },
});

export const Firefly = createComponent('Firefly', {
  index: { type: Types.Int8, default: 0 },
  captured: { type: Types.Boolean, default: false },
});
