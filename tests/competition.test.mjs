import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3 } from '@iwsdk/core';
const url = process.env.ROOMLOOM_TEST_URL;
const { classifySource, observeSources, emptyInputSummary, handsOnlyAllowed, capabilityReport } =
  await import(`${url}roomloom-input.js`);
const { fovPanelDistance, nextQualityTier, QUALITY_TIERS, isLowFpsWindow } =
  await import(`${url}roomloom-performance.js`);
const { CONTRAST_IDS, contrastPalette, contrastCardColor, advanceTutorial, tutorialCopy,
  computeScore, scoreGrade, updateBestScore, roundSummary } =
  await import(`${url}roomloom-presentation.js`);
const { planPuzzle, practicePuzzle } = await import(`${url}roomloom-puzzle.js`);
const { SurfaceSamples } = await import(`${url}roomloom-surfaces.js`);
const { readSanctuary, freshSanctuary, saveSanctuary } = await import(`${url}roomloom-sanctuary.js`);

test('input provenance counts unique sources, never frame repeats', () => {
  const hand = { hand: {}, handedness: 'right', targetRayMode: 'tracked-pointer' };
  assert.equal(classifySource(hand), 'hand');
  assert.equal(classifySource({ targetRayMode: 'gaze' }), 'gaze');
  assert.equal(classifySource({ gamepad: {}, targetRayMode: 'tracked-pointer' }), 'controller');
  assert.equal(classifySource(undefined), 'other');
  let s = emptyInputSummary();
  for (let i = 0; i < 120; i++) s = observeSources(s, [hand]);
  assert.equal(s.handSourcesSeen, 1, 'one hand must not be counted once per frame');
  assert.equal(s.handsOnlySession, true);
  s = observeSources(s, [{ gamepad: {}, handedness: 'left', targetRayMode: 'tracked-pointer' }]);
  assert.equal(s.controllerSourcesSeen, 1);
  assert.equal(s.handsOnlySession, false);
  s = observeSources(s, [{ targetRayMode: 'gaze', handedness: 'none' }]);
  assert.equal(s.gazeSourcesSeen, 1);
});

test('hands-only enforcement rejects controllers and non-hand selections', () => {
  const clean = observeSources(emptyInputSummary(), [{ hand: {}, handedness: 'left', targetRayMode: 'tracked-pointer' }]);
  assert.equal(handsOnlyAllowed(clean, false, 'controller'), true);
  assert.equal(handsOnlyAllowed(clean, true, 'hand'), true);
  assert.equal(handsOnlyAllowed(clean, true, 'gaze'), true);
  assert.equal(handsOnlyAllowed(clean, true, 'controller'), false);
  const withPad = observeSources(clean, [{ gamepad: {}, handedness: 'right', targetRayMode: 'tracked-pointer' }]);
  assert.equal(handsOnlyAllowed(withPad, true, 'hand'), false);
});

test('capability probe reports GRANTED features and names what is missing', () => {
  const none = capabilityReport({});
  assert.equal(none.handTracking, false);
  assert.ok(none.missing.includes('hand tracking'));
  assert.ok(none.missing.includes('room surfaces'));
  assert.ok(none.missing.includes('surface hit-test'));
  const granted = capabilityReport({
    enabledFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'hit-test', 'anchors'],
    planesVisible: true, meshesVisible: true, hitTestAvailable: true, persistentAnchorsAvailable: true,
  });
  assert.deepEqual(granted.missing, []);
  assert.equal(granted.anchors, true);
});

test('FoV-aware panel distance grows on narrower displays and stays bounded', () => {
  assert.ok(fovPanelDistance(60) > fovPanelDistance(90));
  assert.ok(fovPanelDistance(110) < fovPanelDistance(90));
  assert.equal(fovPanelDistance(NaN), 1.8);
  for (const fov of [20, 35, 60, 90, 120, 200]) {
    const d = fovPanelDistance(fov);
    assert.ok(d >= 1.15 && d <= 3.2);
  }
});

test('quality steps down only after two consecutive low windows', () => {
  assert.equal(isLowFpsWindow(58), true);
  assert.equal(isLowFpsWindow(72), false);
  assert.equal(nextQualityTier(0, 1), 0);
  assert.equal(nextQualityTier(0, 2), 1);
  assert.equal(nextQualityTier(1, 3), 2);
  assert.equal(nextQualityTier(2, 9), 2);
  assert.ok(QUALITY_TIERS.every(t => t.maxResidents >= 1), 'interactions stay functional at every tier');
});

test('high contrast gives every text element a color, larger text and a shape cue', () => {
  const normal = contrastPalette(false), high = contrastPalette(true);
  for (const id of CONTRAST_IDS) {
    assert.ok(normal[id].color && high[id].color);
    assert.ok(high[id].fontSize > normal[id].fontSize);
  }
  assert.equal(normal.TitleText.prefix, '');
  assert.equal(high.TitleText.prefix, '■ ');
  assert.notEqual(contrastCardColor(true, false), contrastCardColor(false, false));
});

test('guided onboarding advances on real actions, supports skip and replay', () => {
  assert.equal(advanceTutorial(0, 'look'), 1);
  assert.equal(advanceTutorial(1, 'pinch'), 2);
  assert.equal(advanceTutorial(2, 'arrive'), 3);
  assert.equal(advanceTutorial(0, 'pinch'), 0, 'gate on the actual interaction, not a timer');
  assert.equal(advanceTutorial(1, 'skip'), 3);
  assert.equal(advanceTutorial(3, 'replay'), 0);
  assert.match(tutorialCopy(1).hint, /pinch/i);
  assert.equal(tutorialCopy(3).story, '');
});

test('score rewards efficient routes; replay cannot farm a personal best', () => {
  const base = { found: 3, total: 3, hops: 3, moves: 0, undos: 0, elapsedSeconds: 60 };
  const fast = computeScore(base);
  assert.ok(computeScore({ ...base, hops: 9, moves: 4, undos: 2, elapsedSeconds: 200 }) < fast);
  assert.equal(scoreGrade(900), 'Radiant');
  assert.equal(scoreGrade(700), 'Bright');
  assert.equal(scoreGrade(300), 'Gentle');
  assert.equal(updateBestScore(400, 900, false), 400);
  assert.equal(updateBestScore(400, 900, true), 900);
  assert.equal(updateBestScore(950, 700, true), 950);
  assert.match(roundSummary(fast, 900, 4, 2, 'moon moths'), /Lightkeeping.*Best.*streak.*Tomorrow/);
});

test('no verified room route yields NO playable puzzle; preview is explicitly opt-in', () => {
  const garden = new Vector3(0, .2, 0);
  const blocked = planPuzzle([], garden, () => true);
  assert.equal(blocked.measured, false);
  assert.equal(blocked.points.length, 0);
  assert.equal(blocked.sockets.length, 0);
  assert.match(blocked.reason, /place the garden again/i);
  const preview = practicePuzzle();
  assert.equal(preview.measured, false);
  assert.match(preview.reason, /PREVIEW ONLY/);
  assert.ok(preview.points.length > 0, 'preview is playable only when explicitly requested');
});

test('a measured wall changes the authored topology and is recorded as a source', () => {
  const garden = new Vector3(0, .2, 0);
  const wall = new Vector3(.55, 1.05, -.5);
  const plan = planPuzzle([wall], garden, () => true, ['wall']);
  assert.equal(plan.measured, true);
  assert.ok(plan.sources.includes('wall'));
  assert.match(plan.reason, /wall/);
});

test('vertical planes supply a measured wall sample with a wall source', () => {
  const samples = new SurfaceSamples();
  const polygon = [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 2 }, { x: -1, y: 0, z: 2 }];
  const matrix = new Matrix4().makeTranslation(0, .2, -1.5).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
  const frame = {
    detectedPlanes: new Set([{ orientation: 'vertical', polygon, planeSpace: {} }]),
    detectedMeshes: new Set(),
    getPose: () => ({ transform: { matrix: matrix.elements } }),
  };
  samples.collect(frame, {}, new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
  assert.equal(samples.count, 1);
  assert.equal(samples.sources[0], 'wall');
  assert.deepEqual(samples.authoringSources(), ['wall']);
  assert.ok(samples.points[0].y > 0.8);
});

test('best score survives storage and rejects corrupt values', () => {
  const s = freshSanctuary();
  assert.equal(s.bestScore, 0);
  s.bestScore = 812; s.bestGrade = 'Bright';
  let raw = '';
  const storage = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
  assert.equal(saveSanctuary(storage, s), true);
  assert.deepEqual(readSanctuary(storage), s);
  for (const bad of [{ version: 1, bestScore: Infinity }, { version: 1, bestScore: -5 },
    { version: 1, bestScore: '900' }, { version: 1, bestGrade: 'x'.repeat(99) }]) {
    const parsed = readSanctuary({ getItem: () => JSON.stringify(bad) });
    assert.ok(parsed.bestScore >= 0 && parsed.bestScore <= 1000);
    assert.ok(parsed.bestGrade.length <= 12);
  }
});
