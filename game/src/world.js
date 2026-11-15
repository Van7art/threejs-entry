// Kestrel Yard: an original 46 x 38 m night dockyard. Three lanes run south to
// north into Site A, the crane yard: West Lane past the fuel tanks, Mid through
// stacked containers, East Lane along the dock edge. Cover is crates, containers
// and a low warehouse; every box is both a mesh and an AABB collider, and the
// same AABBs answer line-of-sight, so bullets and bot vision agree.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const tmpMin = new THREE.Vector3();
const tmpMax = new THREE.Vector3();

// Waypoint graph: bots walk these routes. Node: [x, z]. Edges are implicit:
// each node lists its neighbours, so a route is a walk through the graph.
export const WAYPOINTS = [
  [0, 16], [-14, 14], [14, 14],           // 0-2 south spawn row
  [-14, 4], [0, 4], [14, 4],              // 3-5 mid row
  [-14, -6], [0, -6], [14, -6],           // 6-8 north row
  [-8, -13], [0, -13], [8, -13],          // 9-11 site row
  [-18, -12], [18, -12],                  // 12-13 site flanks
  [-7, 10], [7, 10],                      // 14-15 lane mouths
];
export const EDGES = {
  0: [1, 2, 14, 15], 1: [0, 3, 14], 2: [0, 5, 15], 3: [1, 4, 6, 14],
  4: [3, 5, 7], 5: [2, 4, 8, 15], 6: [3, 7, 9, 12], 7: [4, 6, 8, 10],
  8: [5, 7, 11, 13], 9: [6, 10, 12], 10: [7, 9, 11], 11: [8, 10, 13],
  12: [6, 9], 13: [8, 11], 14: [0, 1, 3], 15: [0, 2, 5],
};
export const SITE = { x: 0, z: -13, r: 6.5 }; // Site A centre + radius
export const SPAWNS = {
  ct: [[-4, 15], [0, 16.5], [4, 15], [0, 13]],
  tt: [[-8, -11], [0, -14], [8, -11], [-16, -8]],
};

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const mats = {};
  for (const name of Object.keys(PALETTE)) {
    mats[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'crane' || name === 'accent' ? 0.55 : 0.9,
      metalness: name === 'crane' || name === 'containerBlue' ? 0.35 : 0.05,
    });
  }
  const colliders = [];   // THREE.Box3, one per solid box
  const shootables = [];  // meshes a bullet can stop on
  function box(w, h, d, x, y, z, mat, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[mat]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
      shootables.push(mesh);
    }
    return mesh;
  }
  // Floor and perimeter (walls 5 m high, open sky above).
  box(46.4, 0.4, 38.4, 0, -0.2, 0, 'floor');
  box(0.4, 5, 38.4, -23.2, 2.5, 0, 'wall');
  box(0.4, 5, 38.4, 23.2, 2.5, 0, 'wall');
  box(46.4, 5, 0.4, 0, 2.5, -19.2, 'wall');
  box(46.4, 5, 0.4, 0, 2.5, 19.2, 'wall');
  // Site A: crane legs + a marked pad. The pad is flat, not solid.
  box(0.7, 7, 0.7, -4, 3.5, -15.5, 'crane');
  box(0.7, 7, 0.7, 4, 3.5, -15.5, 'crane');
  box(9.4, 0.7, 0.7, 0, 6.8, -15.5, 'crane');
  const pad = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 7),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.8 }));
  pad.position.set(0, 0.05, -13); pad.receiveShadow = true; group.add(pad);
  // Mid lane: stacked containers make the long sightline and the cross.
  box(6, 2.6, 2.6, -5, 1.3, 4, 'containerBlue');
  box(6, 2.6, 2.6, -5, 3.9, 4, 'containerRust');
  box(6, 2.6, 2.6, 5.5, 1.3, -2, 'containerGreen');
  box(6, 2.6, 2.6, 5.5, 3.9, -2, 'containerBlue');
  box(2.6, 2.6, 6, 0, 1.3, -6.5, 'containerRust');
  // West lane: fuel tanks (cylinders are visual; a box collider stands in).
  for (const [x, z] of [[-17, 6], [-17, -2]]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.4, 18), mats.rust);
    tank.position.set(x, 1.7, z); tank.castShadow = true; tank.receiveShadow = true;
    group.add(tank); shootables.push(tank);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 2.2, 0, z - 2.2), new THREE.Vector3(x + 2.2, 3.4, z + 2.2)));
  }
  // East lane: dock crates and a low warehouse wall with a gap.
  box(3, 1.1, 3, 16, 0.55, 8, 'containerGreen');
  box(3, 1.1, 3, 19, 0.55, 2, 'containerRust');
  box(2.2, 1.1, 2.2, 15, 0.55, -8, 'containerBlue');
  box(10, 3.4, 0.6, 18.5, 1.7, -14, 'wall');
  box(10, 3.4, 0.6, -18.5, 1.7, -14, 'wall');
  // Scattered cover crates, low enough to crouch behind or shoot over.
  box(1.6, 1.1, 1.6, -9, 0.55, 10, 'containerRust');
  box(1.6, 1.1, 1.6, 9, 0.55, 10, 'containerBlue');
  box(1.6, 1.1, 1.6, -11, 0.55, -8, 'containerGreen');
  box(1.6, 1.1, 1.6, 11, 0.55, -8, 'containerRust');
  box(2.4, 0.9, 1.2, -3, 0.45, 11, 'containerGreen');
  box(2.4, 0.9, 1.2, 3, 0.45, 11, 'containerRust');
  box(1.2, 2.2, 1.2, -1.5, 1.1, 0, 'containerBlue');
  // Lighting: cold moon key, warm sodium lamps over the site and mid.
  scene.add(new THREE.HemisphereLight(new THREE.Color('#8fa8c8'), new THREE.Color('#1a2027'), 1.15));
  const moon = new THREE.DirectionalLight(new THREE.Color('#cfe0ff'), 2.1);
  moon.position.set(14, 22, 10); moon.target.position.set(0, 0, -4);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -28; moon.shadow.camera.right = 28;
  moon.shadow.camera.top = 28; moon.shadow.camera.bottom = -28;
  moon.shadow.camera.far = 70; moon.shadow.bias = -0.0006;
  scene.add(moon, moon.target);
  for (const [x, z] of [[0, -13], [0, 4], [-17, 6]]) {
    const lamp = new THREE.PointLight(new THREE.Color(PALETTE.accent), 26, 22, 1.8);
    lamp.position.set(x, 5.2, z); scene.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent) }));
    bulb.position.set(x, 5.2, z); group.add(bulb);
  }
  // Fog + sky colour for depth.
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.sky), 26, 70);

  // Line of sight: segment vs every AABB, using the slab test on a reused
  // pair of vectors — no allocation in the hot loop.
  function blocked(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    for (const c of colliders) {
      let t0 = 0, t1 = 1, ok = true;
      const mins = [c.min.x, c.min.y, c.min.z], maxs = [c.max.x, c.max.y, c.max.z];
      const os = [ax, ay, az], ds = [dx, dy, dz];
      for (let i = 0; i < 3; i += 1) {
        if (Math.abs(ds[i]) < 1e-9) { if (os[i] < mins[i] || os[i] > maxs[i]) { ok = false; break; } continue; }
        let ta = (mins[i] - os[i]) / ds[i], tb = (maxs[i] - os[i]) / ds[i];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t1 > 0 && t0 < 1) return true;
    }
    return false;
  }
  function inSite(x, z) {
    const dx = x - SITE.x, dz = z - SITE.z;
    return dx * dx + dz * dz < SITE.r * SITE.r;
  }
  function nearestWaypoint(x, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < WAYPOINTS.length; i += 1) {
      const dx = WAYPOINTS[i][0] - x, dz = WAYPOINTS[i][1] - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  return { colliders, shootables, group, blocked, inSite, nearestWaypoint };
}
