// The single state store: every module reads and writes this one object, so a
// round's truth lives in exactly one place. No module keeps a private copy of
// health, money, the round or the bomb.
export const PHASE = { MENU: 'menu', BUY: 'buy', LIVE: 'live', OVER: 'over', MATCH: 'match' };
export function createState() {
  return {
    phase: PHASE.MENU,
    round: 1,
    maxRounds: 9,
    winTarget: 5,
    score: { ct: 0, tt: 0 },
    timer: 100,
    bomb: { state: 'carried', x: 0, z: 0, fuse: 35, plantProgress: 0, defuseProgress: 0, carrier: 'player' },
    money: 800,
    kills: { player: 0, ct: 0, tt: 0 },
    elapsed: 0,
    seed: 1,
    frozen: false,
    shot: null,
    winner: null,
    matchWinner: null,
    grenadesThrown: 0,
  };
}
