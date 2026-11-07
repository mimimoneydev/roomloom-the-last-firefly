import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
  Shape,
  ExtrudeGeometry,
  TorusGeometry,
} from '@iwsdk/core';

const charcoal = new MeshStandardMaterial({ color: 0x14231f, roughness: 0.72 });
const soil = new MeshStandardMaterial({ color: 0x241a18, roughness: 0.96 });
const moss = new MeshStandardMaterial({ color: 0x315d47, roughness: 0.9 });
const stone = new MeshStandardMaterial({ color: 0x8b9a91, roughness: 0.82 });
const leaf = new MeshStandardMaterial({ color: 0x55c68b, roughness: 0.62 });
const gold = new MeshStandardMaterial({
  color: 0xffd275,
  emissive: new Color(0xffb13b),
  emissiveIntensity: 0.65,
  roughness: 0.35,
});

function namedMesh(
  name: string,
  geometry: ConstructorParameters<typeof Mesh>[0],
  material: ConstructorParameters<typeof Mesh>[1],
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

export function createGarden(): Object3D {
  const garden = new Group();
  garden.name = 'RoomloomGarden';

  const bowl = namedMesh('GardenBowl', new CylinderGeometry(0.31, 0.24, 0.14, 48), charcoal);
  bowl.position.y = 0.07;
  garden.add(bowl);

  const soilBed = namedMesh('SoilBed', new CylinderGeometry(0.27, 0.27, 0.025, 48), soil);
  soilBed.position.y = 0.15;
  garden.add(soilBed);

  const mossIsland = namedMesh('MossIsland', new SphereGeometry(0.19, 32, 16), moss);
  mossIsland.scale.set(1.35, 0.28, 1.0);
  mossIsland.position.set(0.02, 0.17, 0.01);
  garden.add(mossIsland);

  const rim = namedMesh('CopperRim', new TorusGeometry(0.285, 0.012, 12, 48), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.157;
  garden.add(rim);

  const core = namedMesh('HeartSeed', new SphereGeometry(0.052, 24, 16), gold.clone());
  core.position.set(0, 0.235, 0);
  core.scale.set(1, 0.78, 1);
  garden.add(core);

  const beamMaterial = new MeshBasicMaterial({
    color: 0xffd36b,
    transparent: true,
    opacity: 0.14,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const beam = namedMesh('HeartGlow', new ConeGeometry(0.12, 0.46, 32, 1, true), beamMaterial);
  beam.position.y = 0.43;
  beam.userData.iwsdkPreviewBounds = 'exclude';
  garden.add(beam);

  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const pebble = namedMesh(`Pebble_${i + 1}`, new SphereGeometry(0.035, 14, 10), stone);
    pebble.scale.set(1.2, 0.65, 0.9);
    pebble.position.set(Math.cos(angle) * 0.225, 0.18, Math.sin(angle) * 0.18);
    garden.add(pebble);
  }

  for (let i = 0; i < 3; i += 1) {
    const growth = new Group();
    growth.name = `Growth_${i + 1}`;
    growth.visible = false;
    const angle = -0.9 + i * 0.9;
    growth.position.set(Math.sin(angle) * 0.13, 0.2, Math.cos(angle) * 0.09);

    const stem = namedMesh(`Stem_${i + 1}`, new CylinderGeometry(0.009, 0.013, 0.19 + i * 0.035, 10), leaf);
    stem.position.y = 0.09 + i * 0.017;
    growth.add(stem);

    const blossom = namedMesh(`Blossom_${i + 1}`, new SphereGeometry(0.045 + i * 0.006, 20, 12), gold);
    blossom.scale.set(1.3, 0.55, 1.1);
    blossom.position.y = 0.19 + i * 0.035;
    growth.add(blossom);
    garden.add(growth);
  }

  const shadow = namedMesh(
    'ContactShadow',
    new CircleGeometry(0.34, 48),
    new MeshBasicMaterial({ color: 0x06100d, transparent: true, opacity: 0.28, side: DoubleSide }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  garden.add(shadow);
  return garden;
}

export function createFirefly(): Object3D {
  const firefly = new Group();
  firefly.name = 'LumenFirefly';

  const coreMaterial = new MeshStandardMaterial({
    color: 0xfff0ad,
    emissive: new Color(0xffcb51),
    emissiveIntensity: 0.85,
    roughness: 0.15,
  });
  const core = namedMesh('LumenCore', new SphereGeometry(0.052, 24, 18), coreMaterial);
  firefly.add(core);

  const halo = namedMesh(
    'LumenHalo',
    new SphereGeometry(0.105, 20, 14),
    new MeshBasicMaterial({
      color: 0xffcf61,
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.userData.iwsdkPreviewBounds = 'exclude';
  firefly.add(halo);

  const wingMaterial = new MeshBasicMaterial({
    color: 0xb7fff1,
    transparent: true,
    opacity: 0.58,
    side: DoubleSide,
    depthWrite: false,
  });
  for (const side of [-1, 1]) {
    const wing = namedMesh(`Wing_${side < 0 ? 'L' : 'R'}`, new CircleGeometry(0.065, 20), wingMaterial);
    wing.scale.set(0.72, 1.55, 1);
    wing.position.set(side * 0.06, 0.025, 0.018);
    wing.rotation.y = side * 0.58;
    wing.rotation.x = -0.28;
    firefly.add(wing);
  }

  const tail = namedMesh('CometTail', new ConeGeometry(0.024, 0.15, 12, 1, true), coreMaterial);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 0.105;
  firefly.add(tail);

  const hitTarget = namedMesh(
    'ComfortTarget',
    new SphereGeometry(0.15, 12, 8),
    new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  firefly.add(hitTarget);
  return firefly;
}

// A broad four-wing silhouette distinguishes moths even without their violet color.
// Origin is body center; +Y up, +Z front; envelope ~0.30 x 0.25 x 0.30 m.
export function createMoonMoth(): Object3D {
  const moth = new Group();
  moth.name = 'MoonMoth';
  const silk = new MeshStandardMaterial({ color: 0xdac8ff, emissive: 0xa78bfa, emissiveIntensity: 0.45, roughness: 0.7 });
  const body = namedMesh('MothBody', new SphereGeometry(0.035, 16, 12), silk);
  body.scale.set(0.65, 2.1, 0.7);
  moth.add(body);
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.035, 0.12, 0.14, 0.12, 0.13, 0.045);
  shape.bezierCurveTo(0.12, 0.015, 0.07, -0.005, 0, 0);
  const wingGeometry = new ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, curveSegments: 10 });
  for (const side of [-1, 1]) {
    const wings = new Group();
    wings.name = side < 0 ? 'MothWingsLeft' : 'MothWingsRight';
    wings.scale.x = side;
    wings.position.x = side * 0.008;
    wings.add(namedMesh('UpperWing', wingGeometry, silk));
    const lower = namedMesh('LowerWing', wingGeometry, silk);
    lower.scale.set(0.78, -0.72, 1);
    lower.position.y = -0.01;
    wings.add(lower);
    moth.add(wings);
  }
  const target = namedMesh('MothComfortTarget', new SphereGeometry(0.15, 12, 8),
    new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  target.userData.iwsdkPreviewBounds = 'exclude';
  moth.add(target);
  return moth;
}

export const roomloomGarden = createGarden();
export const roomloomMoth = createMoonMoth();
export const roomloomFirefly = new Group();
const fireflyFamily = createFirefly();
fireflyFamily.name = 'FireflyFamily';
const mothFamily = createMoonMoth();
mothFamily.name = 'MothFamily';
mothFamily.visible = false;
roomloomFirefly.add(fireflyFamily, mothFamily);
