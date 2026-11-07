import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3 } from '@iwsdk/core';
const { advanceProgress, dayNumber, dailySpecies, recordVisit } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-progress.js`);
const { insideSurface, SurfaceSamples } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-surfaces.js`);
const { RoomPlacement } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-placement.js`);

test('same day is idempotent; consecutive dates increment; gaps and future dates reset', () => {
  const date = new Date(2026, 10, 5, 23, 59);
  const day = dayNumber(date);
  assert.equal(advanceProgress({ day, streak: 4 }, date).streak, 4);
  assert.equal(advanceProgress({ day: day - 1, streak: 4 }, date).streak, 5);
  assert.equal(advanceProgress({ day: day - 2, streak: 4 }, date).streak, 1);
  assert.equal(advanceProgress({ day: day + 1, streak: 4 }, date).streak, 1);
  assert.equal(advanceProgress({ day: day - 1, streak: -3 }, date).streak, 1);
});
test('calendar rollover and daily species ignore hours, including DST boundaries', () => {
  for (const [a, b] of [[new Date(2026, 11, 31), new Date(2027, 0, 1)], [new Date(2028, 1, 28), new Date(2028, 1, 29)], [new Date(2026, 2, 8), new Date(2026, 2, 9)]]) {
    assert.equal(dayNumber(b) - dayNumber(a), 1);
    assert.notEqual(dailySpecies(a), dailySpecies(b));
  }
  assert.equal(dailySpecies(new Date(2026, 10, 5, 0)), dailySpecies(new Date(2026, 10, 5, 23)));
});
test('storage corruption and disabled storage do not break completion', () => {
  const storage = { getItem: () => '{bad', setItem: () => { throw Error('blocked'); } };
  assert.equal(recordVisit(storage).streak, 1);
  storage.getItem = () => JSON.stringify({ day: 'bad', streak: Infinity });
  assert.equal(recordVisit(storage).streak, 1);
});
const polygon = [{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }, { x: -1, z: 1 }];
test('surface containment rejects edges and concave cutouts', () => {
  assert.equal(insideSurface(0, 0, polygon, 0.35), true);
  assert.equal(insideSurface(0.8, 0, polygon, 0.35), false);
  assert.equal(insideSurface(2, 0, polygon), false);
  const concave = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 2 }, { x: 0, z: 2 }];
  assert.equal(insideSurface(1.5, 1.5, concave), false);
});
test('measured plane samples stay separated, within reach and in front of viewer', () => {
  const samples = new SurfaceSamples();
  const frame = { detectedPlanes: new Set([{ orientation: 'horizontal', polygon, planeSpace: {} }]), getPose: () => ({ transform: { matrix: new Matrix4().makeTranslation(0, 0.7, -1.5).elements } }) };
  samples.collect(frame, {}, new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
  assert.ok(samples.count >= 3);
  for (let i = 0; i < samples.count; i++) {
    assert.ok(samples.points[i].z < -0.3);
    for (let j = 0; j < i; j++) assert.ok(samples.points[i].distanceTo(samples.points[j]) >= 0.4);
  }
  frame.getPose = () => ({ transform: { matrix: new Matrix4().makeTranslation(0, 0.7, -1.5).multiply(new Matrix4().makeRotationX(Math.PI)).elements } });
  samples.collect(frame, {}, new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
  assert.ok(samples.count >= 3, 'downward plane normals must still support hovering creatures');
  assert.ok(samples.points[0].y > 0.7);
});

function setup({ restore, hitAnchor } = {}) {
  const callbacks = new Map();
  const source = { cancel() {} };
  const session = {
    addEventListener: (event, callback) => callbacks.set(event, callback),
    removeEventListener: (event) => callbacks.delete(event),
    requestReferenceSpace: async () => ({}), requestHitTestSource: async () => source,
    restorePersistentAnchor: restore,
  };
  const poses = [], states = [], visible = [];
  const world = { xrReferenceSpace: {}, camera: {
    getWorldPosition: (v) => v.set(0, 1.6, 0), getWorldDirection: (v) => v.set(0, 0, -1),
  } };
  const placement = new RoomPlacement(world, (matrix, samples, initial) => poses.push({ initial, count: samples?.count }), (state) => states.push(state), (v) => visible.push(v));
  const frame = { session, getPose: () => ({ transform: { matrix: new Matrix4().makeTranslation(0, 0.7, -1).elements } }),
    getHitTestResults: () => [{ getPose: () => frame.getPose(), createAnchor: hitAnchor }],
  };
  return { placement, frame, callbacks, states, visible, poses };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test('mesh-only rooms supply elevated samples from horizontal triangles', () => {
  const samples = new SurfaceSamples();
  const frame = { detectedMeshes: new Set([{ meshSpace: {}, vertices: new Float32Array([-0.5, 0.7, -1.5, 0.5, 0.7, -1.5, 0, 0.7, -0.8]), indices: new Uint32Array([0, 1, 2]) }]),
    getPose: () => ({ transform: { matrix: new Matrix4().elements } }) };
  samples.collect(frame, {}, new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
  assert.equal(samples.count, 1);
  assert.ok(samples.points[0].y > 0.7);
});
test('explicit placement confirms once, handles missing anchors, and cancels scans', async () => {
  globalThis.localStorage = { getItem: () => null };
  const f = setup();
  f.placement.tick(f.frame, 0); await settle();
  f.placement.scan(); f.placement.tick(f.frame, 1);
  assert.equal(f.states.at(-1), 'surface-ready');
  f.callbacks.get('select')(); f.placement.tick(f.frame, 2);
  assert.equal(f.states.at(-1), 'session-only');
  assert.equal(f.poses.filter((p) => p.initial).length, 1);
  f.placement.scan(); f.placement.preview(); f.placement.tick(f.frame, 3);
  assert.equal(f.states.at(-1), 'preview');
  f.placement.reset(); assert.equal(f.callbacks.size, 0);
});
test('late anchor creation cannot resurrect a cancelled placement', async () => {
  globalThis.localStorage = { getItem: () => null };
  let resolve, deleted = 0;
  const f = setup({ hitAnchor: () => new Promise((done) => { resolve = done; }) });
  f.placement.tick(f.frame, 0); await settle(); f.placement.scan(); f.placement.tick(f.frame, 1);
  f.callbacks.get('select')(); f.placement.tick(f.frame, 2); f.placement.preview();
  resolve({ delete: () => deleted++ }); await settle();
  assert.equal(deleted, 1); assert.equal(f.states.at(-1), 'preview');
});
test('restored anchor hides on tracking loss and recovers without restarting round', async () => {
  globalThis.localStorage = { getItem: () => 'saved-handle' };
  const f = setup({ restore: async () => ({ anchorSpace: {}, delete() {} }) });
  f.placement.tick(f.frame, 0); await settle(); f.placement.tick(f.frame, 1);
  assert.equal(f.states.at(-1), 'saved');
  const getPose = f.frame.getPose;
  f.frame.getPose = () => null; f.placement.tick(f.frame, 2);
  assert.equal(f.states.at(-1), 'tracking-lost'); assert.equal(f.visible.at(-1), false);
  f.frame.getPose = getPose; f.placement.tick(f.frame, 3);
  assert.equal(f.states.at(-1), 'saved');
  assert.equal(f.poses.filter((p) => p.initial).length, 1);
});
test('anchor handle persists only after success and replaces the prior handle', async () => {
  const data = new Map([['roomloom.anchor.v1', 'old']]);
  globalThis.localStorage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const f = setup({ hitAnchor: async () => ({ anchorSpace: {}, delete() {}, requestPersistentHandle: async () => 'new' }) });
  const deleted = [];
  f.frame.session.deletePersistentAnchor = async (handle) => deleted.push(handle);
  f.placement.tick(f.frame); await settle(); f.placement.scan(); f.placement.tick(f.frame);
  f.placement.confirmPlacement(); f.placement.tick(f.frame); await settle();
  assert.equal(data.get('roomloom.anchor.v1'), 'new');
  assert.deepEqual(deleted, ['old']); assert.equal(f.states.at(-1), 'saved');
});
test('rejected restoration is recoverable through preview', async () => {
  globalThis.localStorage = { getItem: () => 'stale' };
  const f = setup({ restore: async () => { throw Error('missing'); } });
  f.placement.tick(f.frame); await settle();
  assert.equal(f.states.at(-1), 'restore-failed');
  f.placement.preview(); assert.equal(f.states.at(-1), 'preview');
  assert.equal(f.visible.at(-1), true);
});

const { planRoute, LightRoute, canHop } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-routes.js`);
test('room layout changes legal rescue order: chain versus branching tables', () => {
  const garden = new Vector3(0, 0.2, 0);
  const chain = planRoute([new Vector3(.6,.2,0), new Vector3(1.2,.2,0), new Vector3(1.8,.2,0)], garden);
  assert.equal(chain.measured, true);
  const route = new LightRoute();
  chain.points.forEach((p,i) => route.points[i].copy(p));
  assert.equal(route.light(2), false);
  assert.equal(route.light(1), false);
  assert.equal(route.light(0), true);
  assert.equal(route.light(1), true);
  assert.equal(route.light(2), true);
  assert.deepEqual(route.parents, [-1,0,1]);
  assert.equal(route.light(2), false);
  route.reset();
  assert.deepEqual(route.lit, [false,false,false]);
  const branch = planRoute([new Vector3(-.6,.2,0), new Vector3(.6,.2,0), new Vector3(0,.2,-.6)], garden);
  branch.points.forEach((p,i) => route.points[i].copy(p));
  assert.equal(branch.measured, true);
  assert.equal(route.light(2), true);
  assert.equal(route.light(0), true);
  assert.equal(route.light(1), true);
});
test('unreachable, high, or missing surfaces produce a labeled solvable practice route', () => {
  const garden = new Vector3(0, .2, 0);
  assert.equal(canHop(garden, new Vector3(0, .7, 0)), false);
  for (const samples of [[], [new Vector3(.6,.2,0)], [new Vector3(4,.2,0),new Vector3(5,.2,0),new Vector3(6,.2,0)]]) {
    const plan = planRoute(samples, garden);
    assert.equal(plan.measured, false);
    const route = new LightRoute();
    plan.points.forEach((p,i) => route.points[i].copy(p));
    assert.equal(route.light(0), true);
    assert.equal(route.light(1), true);
    assert.equal(route.light(2), true);
  }
});
test('route selection ignores disconnected outliers and does not mutate room samples', () => {
  const samples = [new Vector3(9,.2,0),new Vector3(.6,.2,0),new Vector3(1.2,.2,0),new Vector3(1.8,.2,0)];
  const before = samples.map(p => p.toArray());
  const plan = planRoute(samples, new Vector3(0,.2,0));
  assert.equal(plan.measured,true);
  assert.deepEqual(plan.points.map(p => p.x), [.6,1.2,1.8]);
  plan.points[0].x = 100;
  assert.deepEqual(samples.map(p => p.toArray()), before);
});

const { RescuePuzzle, practicePuzzle, planPuzzle } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-puzzle.js`);
const { RoomObstacles } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-obstacles.js`);
const { freshSanctuary, rescueResident, gardenStage, readSanctuary, saveSanctuary, nextObjective } = await import(`${process.env.ROOMLOOM_TEST_URL}roomloom-sanctuary.js`);
test('one movable lantern opens different branches and undo restores the previous route', () => {
  const plan=practicePuzzle(), puzzle=new RescuePuzzle();
  puzzle.configure(plan.points,plan.sockets,new Vector3(0,.2,0),()=>true);
  assert.deepEqual(puzzle.path(0),[4]);
  assert.equal(puzzle.path(1),null); assert.equal(puzzle.path(2),null);
  puzzle.choose(0); assert.deepEqual(puzzle.path(1),[3,4]); assert.equal(puzzle.path(2),null);
  puzzle.lit[1]=true;
  puzzle.choose(1); assert.deepEqual(puzzle.path(2),[3,4]);
  puzzle.undo(); assert.equal(puzzle.choice,0); assert.equal(puzzle.path(2),null);
  puzzle.reset(); assert.equal(puzzle.choice,-1); assert.deepEqual(puzzle.lit,[false,false,false]);
});
test('two measured sockets create distinct real-room choices', () => {
  const plan=practicePuzzle();
  const measured=planPuzzle([...plan.points,...plan.sockets],new Vector3(0,.2,0),()=>true);
  assert.equal(measured.measured,true);assert.equal(measured.sockets.length,2);
  const p=new RescuePuzzle();p.configure(measured.points,measured.sockets,new Vector3(0,.2,0),()=>true);
  p.choose(0);const a=Boolean(p.path(1));p.choose(1);assert.notEqual(Boolean(p.path(1)),a);
});
test('a small room stays measured; blocked geometry cannot produce a measured route', () => {
  const samples=[new Vector3(.5,.2,0)];
  const small=planPuzzle(samples,new Vector3(0,.2,0),()=>true);
  assert.equal(small.measured,true);assert.equal(small.points.length,1);assert.equal(small.sockets.length,0);
  assert.equal(planPuzzle(samples,new Vector3(0,.2,0),()=>false).measured,false);
});
test('flight envelope blocks a cabinet wall, permits clear tabletop flight, and fails closed', () => {
  const room=new RoomObstacles(); const a=new Vector3(0,.2,0),b=new Vector3(.8,.2,0);
  assert.equal(room.clear(a,b),false);
  room.add(new Vector3(-2,0,-2),new Vector3(2,0,-2),new Vector3(0,0,2));
  assert.equal(room.clear(a,b),true);
  room.add(new Vector3(.4,0,-1),new Vector3(.4,1,-1),new Vector3(.4,.5,1));
  assert.equal(room.clear(a,b),false);assert.equal(room.clear(b,a),false);
  room.complete=false; assert.equal(room.clear(new Vector3(-1,.3,0),a),false);
});
test('daily residents persist, replay cannot farm growth, and tomorrow has a new goal', () => {
  const s=freshSanctuary(), today=new Date(2026,10,6),tomorrow=new Date(2026,10,7);
  rescueResident(s,'Lumen fireflies',0,today);assert.equal(gardenStage(s),1);assert.equal(s.introDone,true);
  assert.equal(rescueResident(s,'Lumen fireflies',0,today),false);
  rescueResident(s,'Lumen fireflies',1,today);rescueResident(s,'Lumen fireflies',2,today);
  assert.equal(gardenStage(s),2);assert.match(nextObjective(s),/3 more/);
  for(let i=0;i<3;i++)rescueResident(s,'Moon moths',i,tomorrow);
  assert.equal(gardenStage(s),3);assert.equal(s.discoveries.length,2);
  let raw='';const storage={getItem:()=>raw,setItem:(_k,v)=>raw=v};
  assert.equal(saveSanctuary(storage,s),true);assert.deepEqual(readSanctuary(storage),s);
  for(let i=0;i<3;i++)rescueResident(s,'Lumen fireflies',i,new Date(2026,10,8));
  assert.equal(gardenStage(s),4);
});
test('sanctuary handles corrupt or denied storage without promising persistence', () => {
  assert.deepEqual(readSanctuary({getItem:()=>'{oops'}),freshSanctuary());
  assert.equal(saveSanctuary({setItem:()=>{throw Error('denied')}},freshSanctuary()),false);
  assert.deepEqual(readSanctuary({getItem:()=>JSON.stringify({version:1,residents:[null,'x','x',42],days:['today',1,1],discoveries:[]})}).residents,['x']);
});
