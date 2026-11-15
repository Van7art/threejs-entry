// Economy: money earned per round and spent in the buy menu. One table of
// prices and one set of rewards; main.js calls award() on round events and
// buyMenu() is read by hud.js to build the shop.
import { WEAPONS, GRENADE, ARMOR } from './weapons.js';
export const REWARDS = { win: 3250, loss: 1900, kill: 300, plant: 300, defuse: 300 };
export function shopItems(owned, grenades) {
  const items = [];
  for (const key of ['p9', 'vk9', 'ar77', 'kr12']) {
    const w = WEAPONS[key];
    items.push({ key, name: `${w.name} — ${w.auto ? 'auto' : 'semi-auto'}, ${w.damage} dmg, ${w.mag} rnd mag`, price: w.price, owned: Boolean(owned[key]), disabled: Boolean(owned[key]) });
  }
  items.push({ key: 'frag', name: `${GRENADE.name} grenade — throw with G, area damage`, price: GRENADE.price, owned: grenades > 0, disabled: grenades >= 2 });
  items.push({ key: 'armor', name: `${ARMOR.name} — absorbs half of incoming damage`, price: ARMOR.price, owned: false, disabled: false });
  return items;
}
export function priceOf(key) {
  if (key === 'frag') return GRENADE.price;
  if (key === 'armor') return ARMOR.price;
  return WEAPONS[key].price;
}
