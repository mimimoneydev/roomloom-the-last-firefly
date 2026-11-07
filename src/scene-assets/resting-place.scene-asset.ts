import { Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, TorusGeometry, SphereGeometry } from '@iwsdk/core';

// A small horizontal beacon, 28 cm wide. Origin is the hovering resting point;
// +Y is up. Ring and three seeds remain readable from above and seated oblique views.
export const restingPlace = new Group();
restingPlace.name = 'RestingPlace';
const material = new MeshStandardMaterial({ color: 0x77e6ca, emissive: 0x23785e, emissiveIntensity: 1.4, roughness: 0.6 });
const ring = new Mesh(new TorusGeometry(0.12, 0.012, 6, 32), material);
ring.name = 'SafeRestRing';
ring.rotation.x = -Math.PI / 2;
restingPlace.add(ring);
const seed = new SphereGeometry(0.025, 8, 6);
for (let i = 0; i < 3; i++) {
  const bead = new Mesh(seed, material);
  bead.name = `RestSeed_${i + 1}`;
  bead.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.12, 0.025, Math.sin(i * Math.PI * 2 / 3) * 0.12);
  restingPlace.add(bead);
}

const target = new Mesh(new SphereGeometry(0.16, 12, 8),
  new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
target.name = 'RestComfortTarget';
target.position.y = 0.08;
target.userData.iwsdkPreviewBounds = 'exclude';
restingPlace.add(target);
