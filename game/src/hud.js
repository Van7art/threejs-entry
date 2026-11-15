// The DOM HUD: health, armour, ammo, timer, score, money, kill feed, crosshair
// spread, banners, the plant/defuse bar and the buy menu. It never touches the
// simulation; main.js pushes numbers in and reads callbacks out.
import { shopItems } from './economy.js';

const COPY = {
  start: { title: 'Kestrel Yard', copy: 'A night dockyard on the harbour. Kestrel attacks Site A — plant the charge at the crane yard, or clear every Vulture. First to 5 rounds takes the yard.', action: 'Click to play' },
  paused: { title: 'Kestrel Yard', copy: 'Paused. Click to resume.', action: 'Click to resume' },
  roundWin: { title: 'Round won', copy: '', action: 'Next round' },
  roundLose: { title: 'Round lost', copy: '', action: 'Next round' },
  matchWin: { title: 'Kestrel takes the yard', copy: '', action: 'Play again' },
  matchLose: { title: 'Vulture holds the yard', copy: '', action: 'Play again' },
};

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const overlay = $('overlay'), title = $('overlay-title'), copy = $('overlay-copy'), play = $('play');
  const buyEl = $('buy'), shop = $('shop');
  const els = {
    health: $('health-value'), healthBox: $('health'), armor: $('armorline'),
    mag: $('ammo-mag'), reserve: $('ammo-reserve'), weapon: $('ammo-weapon'), ammoBox: $('ammo'),
    timer: $('timer'), round: $('round-label'), scoreCt: $('score-ct'), scoreTt: $('score-tt'),
    money: $('money'), killfeed: $('killfeed'), banner: $('banner'),
    objective: $('objective-state'), grenades: $('grenades'),
    plantbar: $('plantbar'), plantfill: $('plantbar').querySelector('i'), plantlabel: $('plantlabel'),
    crosshair: $('crosshair'),
  };
  let last = {};
  let hitTimer = 0;
  let bannerTimer = 0;
  function setText(el, key, value) { if (last[key] !== value) { last[key] = value; el.textContent = value; } }
  return {
    setHealth(hp, armor) {
      setText(els.health, 'hp', String(Math.ceil(hp)));
      els.healthBox.classList.toggle('low', hp <= 30);
      setText(els.armor, 'armor', armor > 0 ? `ARMOR ${Math.ceil(armor)}` : '');
    },
    setAmmo(name, mag, reserve) {
      setText(els.weapon, 'w', name);
      setText(els.mag, 'mag', String(mag));
      setText(els.reserve, 'res', `/ ${reserve}`);
      els.ammoBox.classList.toggle('empty', mag === 0);
    },
    setGrenades(n) { setText(els.grenades, 'g', n > 0 ? `FRAG ×${n}  [G]` : ''); },
    setTimer(seconds, planted) {
      const s = Math.max(0, Math.ceil(seconds));
      setText(els.timer, 't', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      els.timer.classList.toggle('planted', planted);
    },
    setScore(ct, tt, round, maxRounds) {
      setText(els.scoreCt, 'ct', String(ct));
      setText(els.scoreTt, 'tt', String(tt));
      setText(els.round, 'r', `ROUND ${round}/${maxRounds}`);
    },
    setMoney(m) { setText(els.money, 'm', `$${m}`); },
    setObjective(text) { setText(els.objective, 'o', text); },
    setSpread(spread) {
      const px = Math.round(4 + spread * 260);
      els.crosshair.style.setProperty('--gap', `${px}px`);
      els.crosshair.querySelectorAll('i').forEach((el, i) => {
        if (i === 0) el.style.top = `-${px}px`;
        if (i === 1) el.style.bottom = `-${px}px`;
        if (i === 2) el.style.left = `-${px}px`;
        if (i === 3) el.style.right = `-${px}px`;
      });
      els.crosshair.style.width = '24px'; els.crosshair.style.height = '24px';
    },
    hitMarker(killed, head, holdMs = 90) {
      const hm = document.getElementById('hitmarker');
      hm.classList.add('on'); hm.classList.toggle('head', head);
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => hm.classList.remove('on'), holdMs);
    },
    feed(text) {
      const div = document.createElement('div');
      div.innerHTML = text;
      els.killfeed.prepend(div);
      while (els.killfeed.children.length > 5) els.killfeed.lastChild.remove();
      setTimeout(() => { if (div.parentNode) div.remove(); }, 8000);
    },
    banner(text, sub = '') {
      els.banner.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
      els.banner.classList.add('on');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => els.banner.classList.remove('on'), 2600);
    },
    hideBanner() { els.banner.classList.remove('on'); },
    setPlant(label, frac) {
      if (!label) { els.plantbar.hidden = true; els.plantlabel.hidden = true; return; }
      els.plantbar.hidden = false; els.plantlabel.hidden = false;
      els.plantlabel.textContent = label;
      els.plantfill.style.width = `${Math.round(frac * 100)}%`;
    },
    showOverlay(mode, detail = '') {
      const text = COPY[mode];
      title.textContent = text.title;
      copy.textContent = detail || text.copy;
      play.textContent = text.action;
      overlay.hidden = false;
    },
    hideOverlay() { overlay.hidden = true; },
    onPlay(handler) { play.addEventListener('click', handler); },
    openBuy(round, money, owned, grenades, onBuy, onDone) {
      $('buy-round').textContent = String(round);
      $('buy-money').textContent = `$${money}`;
      shop.innerHTML = '';
      for (const item of shopItems(owned, grenades)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<span>${item.name}</span><b>${item.owned ? 'OWNED' : '$' + item.price}</b>`;
        b.disabled = item.disabled || (!item.owned && money < item.price);
        if (item.owned) b.classList.add('owned');
        b.addEventListener('click', () => onBuy(item.key));
        shop.appendChild(b);
      }
      buyEl.hidden = false;
      $('buy-done').onclick = onDone;
    },
    closeBuy() { buyEl.hidden = true; },
    buyVisible() { return !buyEl.hidden; },
  };
}
