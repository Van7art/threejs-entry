// Kestrel Yard look: a night dockyard — deep blue-grey steel, rust orange accent,
// teal for the Kestrel team, hazard amber for the site. One palette, used by CSS
// and by every mesh material, so the scene reads at a glance.
export const PALETTE = {
  canvas: '#10151c',
  surface: '#1a222c',
  hairline: '#2b3644',
  ink: '#e8e4d8',
  muted: '#93a0ae',
  accent: '#f2a71b',
  teal: '#2ec4b6',
  danger: '#e4572e',
  rust: '#8a4b2a',
  containerBlue: '#2e5a74',
  containerGreen: '#3d6b4f',
  containerRust: '#7a4a30',
  floor: '#232c36',
  wall: '#1d2630',
  crane: '#c98a1b',
  sky: '#0d1420',
};
export function shade(name) { return PALETTE[name]; }
