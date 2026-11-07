import { defineComponents } from '@iwsdk/core';
import { Firefly, RoomloomState, RestingPlace, RelaySocket, GardenResident, RoomloomSound } from './roomloom-component.js';

export default defineComponents([RoomloomState, Firefly, RestingPlace, RelaySocket, GardenResident, RoomloomSound]);
