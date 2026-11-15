// Weapons: one table, one view model. Hitscan with a headshot multiplier, recoil
// and spread that grow while moving and while firing, finite magazines and
// reserves, and different fire rates — stopping to aim always pays.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPONS = {
  p9:   { name: 'P9',     slot: 1, price: 0,    auto: false, gap: 0.16, mag: 12, reserve: 36, reload: 1.4, damage: 26, headMul: 2.0, spread: 0.006, moveSpread: 0.030, kick: 0.010, range: 60 },
  vk9:  { name: 'VK-9',   slot: 2, price: 1500, auto: true,  gap: 0.075, mag: 32, reserve: 96, reload: 2.0, damage: 22, headMul: 2.0, spread: 0.010, moveSpread: 0.042, kick: 0.008, range: 45 },
  ar77: { name: 'AR-77',  slot: 3, price: 2700, auto: true,  gap: 0.098, mag: 25, reserve: 75, reload: 2.2, damage: 34, headMul: 2.0, spread: 0.004, moveSpread: 0.034, kick: 0.012, range: 80 },
  kr12: { name: 'KR-12',  slot: 4, price: 3500, auto: false, gap: 0.85, mag: 5,  reserve: 15, reload: 2.8, damage: 82, headMul: 2.5, spread: 0.001, moveSpread: 0.05, kick: 0.05, range: 100 },
};
export const GRENADE = { name: 'Frag', price: 300 };
export const ARMOR = { name: 'Kevlar', price: 650 };

export function createWeaponSet(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.45, metalness: 0.4 });
  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.46), body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.42), grip);
  barrel.position.set(0, 0.03, -0.4);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.24), grip);
  stock.position.set(0, -0.02, 0.32);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.1), grip);
  sight.position.set(0, 0.085, -0.05);
  model.add(receiver, barrel, stock, sight);
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  flash.position.set(0.24, -0.17, -0.95); flash.visible = false; camera.add(flash);
  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 6);
  flashLight.position.set(0.24, -0.16, -0.6); camera.add(flashLight);

  const owned = { p9: { mag: 12, reserve: 36 }, ar77: { mag: 25, reserve: 75 } };
  const state = {
    current: 'ar77', cooldown: 0, reloadLeft: 0, flash: 0, kick: 0,
    heat: 0, // bloom: grows per shot, decays with time; firing on the move stacks it
    grenades: 1, armor: 0,
  };
  function def() { return WEAPONS[state.current]; }
  function ammo() { return owned[state.current]; }
  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.heat = Math.max(0, state.heat - dt * 0.9);
    state.kick += (0 - state.kick) * Math.min(1, dt * 13);
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.4;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 28;
    flashLight.intensity = state.flash > 0 ? 20 : 0;
    const d = def();
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.5 * Math.min(1, (d.reload - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const a = ammo(); const need = d.mag - a.mag;
        const take = Math.min(need, a.reserve);
        a.mag += take; a.reserve -= take;
      }
    }
  }
  return {
    state, owned, def, ammo, step,
    ready() { const a = ammo(); return a.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0; },
    pullTrigger() { state.cooldown = def().gap; state.flash = 0.06; state.kick = 0.055 + def().kick; state.heat = Math.min(1, state.heat + 0.16); },
    takeRound() { const a = ammo(); if (a.mag <= 0) return false; a.mag -= 1; return true; },
    reload() { const d = def(); const a = ammo(); if (state.reloadLeft > 0 || a.mag === d.mag || a.reserve === 0) return; state.reloadLeft = d.reload; },
    spread(speed) {
      const d = def();
      const move = Math.min(1, speed / 5.2);
      return d.spread + move * d.moveSpread + state.heat * 0.02;
    },
    refillAmmo() { for (const key of Object.keys(owned)) { owned[key].mag = WEAPONS[key].mag; owned[key].reserve = WEAPONS[key].reserve; } },
    select(key) {
      if (!owned[key] || state.reloadLeft > 0) return false;
      state.current = key; state.cooldown = Math.max(state.cooldown, 0.25);
      return true;
    },
    buy(key) { if (owned[key]) return false; owned[key] = { mag: WEAPONS[key].mag, reserve: WEAPONS[key].reserve }; return true; },
  };
}
