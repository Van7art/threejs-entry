// Bots: one finite-state machine per bot, driven by the same world the player
// walks — waypoint routes through the lanes, hold angles at the site, reaction
// to sight and to sound, retreat when hurt, and the objective roles (plant
// for the carrier, defuse for a defender when the charge is down). They shoot
// with inaccuracy that grows with distance and with the target's movement, so
// a strafing player is hard to hit and a still one is not.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { WAYPOINTS, EDGES, SITE, SPAWNS } from './world.js';

const RADIUS = 0.34;
const EYE = 1.45;
const BODY_H = 1.7;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMesh(scene, team, name) {
  const group = new THREE.Group();
  const bodyColor = team === 'ct' ? PALETTE.teal : PALETTE.danger;
  const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(bodyColor), roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a184'), roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), bodyMat);
  torso.position.y = 1.05; torso.castShadow = true;
  torso.userData = { bot: true, part: 'body' };
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat);
  head.position.y = 1.6; head.castShadow = true;
  head.userData = { bot: true, part: 'head' };
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), darkMat);
  helmet.position.y = 1.76;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), darkMat);
  legL.position.set(-0.14, 0.31, 0);
  const legR = legL.clone(); legR.position.x = 0.14;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.62), darkMat);
  gun.position.set(0.22, 1.18, -0.28);
  group.add(torso, head, helmet, legL, legR, gun);
  group.userData.name = name;
  scene.add(group);
  return { group, torso, head, legL, legR };
}

export function createBots(scene, world) {
  const bots = [];
  const random = mulberry32(1234);
  const tracerMat = new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.8 });
  const tracers = [];
  function spawnTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, tracerMat.clone());
    scene.add(line);
    tracers.push({ line, life: 0.12 });
  }
  function stepTracers(dt) {
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers[i].line.geometry.dispose(); tracers.splice(i, 1); }
    }
  }
  function makeBot(team, index, name, weapon) {
    const spawn = SPAWNS[team][index % SPAWNS[team].length];
    const mesh = makeMesh(scene, team, name);
    const bot = {
      team, name, index, mesh,
      position: new THREE.Vector3(spawn[0], 0, spawn[1]),
      velocity: new THREE.Vector3(),
      yaw: team === 'ct' ? 0 : Math.PI,
      hp: 100, alive: true,
      weapon, fireTimer: 0.5 + random() * 0.8,
      state: team === 'tt' ? 'hold' : 'advance',
      waypoint: world.nearestWaypoint(spawn[0], spawn[1]),
      target: null, seenTimer: 0, reaction: 0,
      investigate: null, investigateTimer: 0,
      holdTimer: 1 + random() * 2,
      plantProgress: 0, defuseProgress: 0,
      carrier: false, speed: 3.4 + random() * 0.6,
      walkPhase: random() * 6,
      lastShotPos: null,
    };
    mesh.group.position.copy(bot.position);
    bots.push(bot);
    return bot;
  }
  const NAMES_CT = ['Falcon', 'Wren', 'Heron'];
  const NAMES_TT = ['Viper', 'Jackal', 'Cobra', 'Rook'];
  function resetRound() {
    for (const bot of bots) scene.remove(bot.mesh.group);
    bots.length = 0;
    NAMES_CT.forEach((n, i) => makeBot('ct', i, n, i === 0 ? 'ar77' : 'vk9'));
    NAMES_TT.forEach((n, i) => makeBot('tt', i, n, i === 2 ? 'kr12' : 'ar77'));
    // Defenders hold the site and the mid cross; attackers push the lanes.
    bots[3].waypoint = 10; bots[4].waypoint = 7; bots[5].waypoint = 9; bots[6].waypoint = 11;
    bots[0].waypoint = 14; bots[1].waypoint = 4; bots[2].waypoint = 15;
  }
  function overlaps(x, z) {
    for (const c of world.colliders) {
      if (x + RADIUS > c.min.x && x - RADIUS < c.max.x && z + RADIUS > c.min.z && z - RADIUS < c.max.z && 0 + BODY_H > c.min.y && 0 < c.max.y) return c;
    }
    return null;
  }
  function moveToward(bot, tx, tz, dt, speed) {
    const dx = tx - bot.position.x, dz = tz - bot.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.3) return true;
    const vx = (dx / dist) * speed, vz = (dz / dist) * speed;
    bot.yaw = Math.atan2(-dx, -dz);
    const nx = bot.position.x + vx * dt;
    if (!overlaps(nx, bot.position.z)) bot.position.x = nx;
    const nz = bot.position.z + vz * dt;
    if (!overlaps(bot.position.x, nz)) bot.position.z = nz;
    bot.walkPhase += dt * 9;
    return dist < 0.6;
  }
  function canSee(bot, tx, ty, tz) {
    const dx = tx - bot.position.x, dy = ty - EYE, dz = tz - bot.position.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 42) return false;
    return !world.blocked(bot.position.x, EYE, bot.position.z, tx, ty, tz);
  }
  function facing(bot, tx, tz) {
    const dx = tx - bot.position.x, dz = tz - bot.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const fx = -Math.sin(bot.yaw), fz = -Math.cos(bot.yaw);
    return (dx / dist) * fx + (dz / dist) * fz;
  }
  // The one public hook for sound: a gunshot makes nearby enemies investigate.
  function hearShot(x, z, team) {
    for (const bot of bots) {
      if (!bot.alive || bot.team === team) continue;
      const d = Math.hypot(bot.position.x - x, bot.position.z - z);
      if (d < 26 && bot.state !== 'engage') {
        bot.investigate = { x, z }; bot.investigateTimer = 6; bot.state = 'investigate';
      }
    }
  }
  function pickNextWaypoint(bot, goalNode) {
    // Greedy walk toward the goal node through the graph.
    const neighbours = EDGES[bot.waypoint] || [];
    let best = bot.waypoint, bestD = Infinity;
    for (const n of neighbours) {
      const dx = WAYPOINTS[n][0] - WAYPOINTS[goalNode][0], dz = WAYPOINTS[n][1] - WAYPOINTS[goalNode][1];
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best === bot.waypoint && neighbours.length) best = neighbours[Math.floor(random() * neighbours.length)];
    return best;
  }
  function step(dt, api) {
    // api: { player, bomb, state, damagePlayer(dmg, fromName), killFeed(text), onBotKilled(bot, killer), onPlant(), onDefuse(), audio }
    stepTracers(dt);
    for (const bot of bots) {
      if (!bot.alive) continue;
      bot.fireTimer -= dt;
      const enemies = bot.team === 'ct'
        ? bots.filter((b) => b.team === 'tt' && b.alive)
        : bots.filter((b) => b.team === 'ct' && b.alive);
      // Vision: nearest visible enemy bot, or the player when this bot is a defender.
      let visible = null, visibleDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.position.x - bot.position.x, e.position.z - bot.position.z);
        if (d < visibleDist && canSee(bot, e.position.x, 1.3, e.position.z) && facing(bot, e.position.x, e.position.z) > -0.2) {
          visible = { kind: 'bot', bot: e, dist: d }; visibleDist = d;
        }
      }
      const p = api.player;
      if (bot.team === 'tt' && p.alive) {
        const d = Math.hypot(p.position.x - bot.position.x, p.position.z - bot.position.z);
        if (d < visibleDist && canSee(bot, p.position.x, p.position.y + p.eye, p.position.z) && facing(bot, p.position.x, p.position.z) > -0.2) {
          visible = { kind: 'player', dist: d }; visibleDist = d;
        }
      }
      if (bot.team === 'ct' && p.alive) {
        // Allies never shoot the player; they only see enemies (handled above).
      }
      if (visible) {
        bot.seenTimer += dt;
        if (bot.seenTimer > 0.35) bot.state = 'engage';
      } else bot.seenTimer = 0;
      if (bot.state === 'engage' && !visible) { bot.state = bot.team === 'tt' ? 'hold' : 'advance'; bot.holdTimer = 0.5; }

      // Objective roles.
      if (api.state.bomb.state === 'planted' && bot.team === 'tt') {
        const dSite = Math.hypot(bot.position.x - api.state.bomb.x, bot.position.z - api.state.bomb.z);
        if (dSite < 1.6) {
          bot.state = 'defuse';
        } else if (bot.state !== 'engage') bot.state = 'retake';
      }
      if (bot.carrier && api.state.bomb.state === 'carried' && bot.team === 'ct' && bot.alive) {
        if (world.inSite(bot.position.x, bot.position.z) && bot.state !== 'engage') bot.state = 'plant';
      }

      const speed = bot.state === 'engage' ? bot.speed * 0.4 : bot.speed;
      if (bot.state === 'advance' || bot.state === 'investigate' || bot.state === 'retake') {
        let gx, gz;
        if (bot.state === 'investigate' && bot.investigate) { gx = bot.investigate.x; gz = bot.investigate.z; bot.investigateTimer -= dt; if (bot.investigateTimer <= 0) { bot.state = 'advance'; bot.investigate = null; } }
        else if (bot.state === 'retake') { gx = api.state.bomb.x; gz = api.state.bomb.z; }
        else { const wp = WAYPOINTS[bot.waypoint]; gx = wp[0]; gz = wp[1]; }
        const arrived = moveToward(bot, gx, gz, dt, speed);
        if (arrived && bot.state === 'advance') {
          const goal = bot.team === 'ct' ? 10 : bot.waypoint;
          bot.waypoint = bot.team === 'ct' ? pickNextWaypoint(bot, goal) : bot.waypoint;
          if (bot.team === 'tt') { bot.state = 'hold'; bot.holdTimer = 2 + random() * 3; }
        }
        if (arrived && bot.state === 'investigate') { bot.state = 'hold'; bot.holdTimer = 2; }
        if (arrived && bot.state === 'retake') { bot.state = 'hold'; bot.holdTimer = 1; }
      } else if (bot.state === 'hold') {
        bot.holdTimer -= dt;
        bot.yaw += Math.sin(api.state.elapsed * 0.5 + bot.index) * dt * 0.25; // scan the angle
        if (bot.holdTimer <= 0) {
          if (bot.team === 'tt') { bot.waypoint = [9, 10, 11, 7][Math.floor(random() * 4)]; bot.state = 'advance'; }
          else { bot.waypoint = pickNextWaypoint(bot, 10); bot.state = 'advance'; }
        }
      } else if (bot.state === 'plant') {
        bot.plantProgress += dt;
        if (bot.plantProgress >= 4) { bot.plantProgress = 0; api.onPlant(bot); }
      } else if (bot.state === 'defuse') {
        bot.defuseProgress += dt;
        if (bot.defuseProgress >= 5) { bot.defuseProgress = 0; api.onDefuse(bot); }
      }
      // Low HP: fall back to the nearest waypoint behind the front.
      if (bot.hp < 30 && bot.state === 'engage') { bot.state = 'retreat'; bot.waypoint = world.nearestWaypoint(bot.position.x, bot.position.z); }
      if (bot.state === 'retreat') {
        const wp = WAYPOINTS[bot.waypoint];
        moveToward(bot, wp[0], wp[1], dt, bot.speed * 1.15);
        if (bot.hp > 55) bot.state = 'hold';
      }
      // Shooting: only while engaging, on the weapon's cadence.
      if (bot.state === 'engage' && visible && bot.fireTimer <= 0) {
        const w = bot.weapon === 'kr12' ? { gap: 0.9, dmg: 82 } : bot.weapon === 'vk9' ? { gap: 0.09, dmg: 22 } : { gap: 0.12, dmg: 34 };
        bot.fireTimer = w.gap * (0.9 + random() * 0.5);
        const targetSpeed = visible.kind === 'player' ? Math.hypot(p.velocity.x, p.velocity.z) : 2;
        const hitChance = Math.max(0.08, 0.55 - visible.dist * 0.009 - targetSpeed * 0.03 - (bot.state === 'engage' && speed > 2 ? 0.08 : 0));
        const muzzle = new THREE.Vector3(bot.position.x, 1.25, bot.position.z);
        let end;
        if (visible.kind === 'player') end = new THREE.Vector3(p.position.x, p.position.y + 1.2, p.position.z);
        else end = new THREE.Vector3(visible.bot.position.x, 1.2, visible.bot.position.z);
        spawnTracer(muzzle, end);
        api.audio.distantShot();
        if (random() < hitChance) {
          const head = random() < 0.12;
          const dmg = w.dmg * (head ? 2 : 1);
          if (visible.kind === 'player') api.damagePlayer(dmg, bot.name);
          else api.damageBot(visible.bot, dmg, head ? 'head' : 'body', bot);
        }
      }
      // Sync mesh: position, facing, walk bob.
      bot.mesh.group.position.set(bot.position.x, 0, bot.position.z);
      bot.mesh.group.rotation.y = bot.yaw;
      const bob = Math.sin(bot.walkPhase) * 0.06;
      bot.mesh.legL.rotation.x = bob; bot.mesh.legR.rotation.x = -bob;
      bot.mesh.group.position.y = Math.abs(Math.sin(bot.walkPhase)) * 0.03;
    }
  }
  function damageBot(bot, amount, part, killer) {
    if (!bot.alive) return false;
    bot.hp -= amount;
    if (bot.hp <= 0) {
      bot.hp = 0; bot.alive = false;
      bot.mesh.group.visible = false;
      return true;
    }
    return false;
  }
  function aliveCount(team) { return bots.filter((b) => b.team === team && b.alive).length; }
  function hitMeshes() {
    const list = [];
    for (const bot of bots) {
      if (!bot.alive) continue;
      bot.mesh.torso.userData.botRef = bot; bot.mesh.head.userData.botRef = bot;
      list.push(bot.mesh.torso, bot.mesh.head);
    }
    return list;
  }
  return { bots, resetRound, step, hearShot, damageBot, aliveCount, hitMeshes, stepTracers };
}
