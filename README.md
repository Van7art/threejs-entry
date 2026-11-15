# threejs-entry

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/Van7art/threejs-entry/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/Van7art/threejs-entry/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

**Kestrel Yard** — an original round-based tactical FPS in three.js. You lead Kestrel (3 bot teammates) against 4 Vulture defenders in a night dockyard with three lanes into Site A, the crane yard. Plant the charge or clear the enemy team; first to 5 rounds takes the yard. Money earned per round buys rifles, an SMG, a marksman rifle, frag grenades and kevlar between rounds. Bots follow waypoint routes, hold angles, react to sight and gunfire, retreat when hurt, plant the charge if you go down, and retake/defuse when it is planted.

## Controls

WASD move · Mouse look (pointer lock) · Click fire · R reload · Shift walk slow · Ctrl/C crouch · 1–4 weapons · G throw frag · E plant the charge (hold, inside Site A) · B buy menu · Space jump

## Weapons

P9 pistol · VK-9 SMG · AR-77 rifle · KR-12 marksman rifle — hitscan, headshots deal double damage, recoil and spread punish firing on the move, finite magazines and reserves.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network requests — three.js 0.187.0 is vendored under game/vendor/three/.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4e96xqxt&utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
