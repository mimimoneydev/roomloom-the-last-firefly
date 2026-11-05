import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { RoomloomSystem } from './roomloom.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(RoomloomSystem);
});
