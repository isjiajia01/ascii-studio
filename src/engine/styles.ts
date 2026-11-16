export type StyleId = 'classic'|'detailed'|'blocks'|'letters'|'sparse'|'binary'|'braille'|'dots'|'dither'|'bricks'|'custom'|'particles'|'film'|'drift';

export interface StyleDef {
  id: StyleId; name: string; desc: string;
  mode: number;        // shader mode
  aspect: number;      // cell height / width
  chars?: string;      // glyph ramp, dark -> light
  sort?: boolean;      // sort glyphs by measured ink coverage
  tone?: number;       // gamma on luminance before glyph pick
  shade?: number;      // multiply colour by luminance (glyph does not encode brightness)
  random?: boolean;    // random glyph, brightness only
  tile?: boolean;      // draw a dim tile behind glyph
}

export const STYLES: Record<StyleId, StyleDef> = {
  classic:  { id:'classic', name:'Classic', desc:'Characters chosen by brightness, with the edges traced in lines.', mode:0, aspect:2, chars:' .:-=+*#%@' },
  detailed: { id:'detailed', name:'Detailed', desc:"A long run of fine characters, in the picture's own colours.", mode:0, aspect:2, chars:' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$', sort:true },
  blocks:   { id:'blocks', name:'Shade blocks', desc:'Chunky shade blocks, from light to solid.', mode:0, aspect:2, chars:' ░▒▓█' },
  letters:  { id:'letters', name:'Letter tiles', desc:'Letters on dim tiles, like a keyboard wall.', mode:0, aspect:2, chars:' ABCDEFGHIJKLMNOPQRSTUVWXYZ', sort:true, shade:0.6, tile:true },
  sparse:   { id:'sparse', name:'Sparse', desc:'Only the darkest areas get a mark. Airy and light.', mode:0, aspect:2, chars:' .:+*', tone:2.2 },
  binary:   { id:'binary', name:'Binary', desc:'Ones and zeros, shimmering with the light.', mode:0, aspect:2, chars:'01', random:true, shade:1 },
  braille:  { id:'braille', name:'Braille', desc:'Tiny raised-dot cells for smooth, delicate detail.', mode:4, aspect:2 },
  dots:     { id:'dots', name:'Round dots', desc:'A halftone grid, like a printed poster.', mode:1, aspect:1 },
  dither:   { id:'dither', name:'Dither', desc:'One-bit ordered grain, crisp as an old screen.', mode:2, aspect:1 },
  bricks:   { id:'bricks', name:'Bricks', desc:'A toy-brick mosaic with studs, in a limited colour set.', mode:3, aspect:1 },
  custom:   { id:'custom', name:'Custom', desc:'Your own characters, from dark to light.', mode:0, aspect:2, chars:' .oO@' },
  particles:{ id:'particles', name:'Particles', desc:'A glowing swarm of dots that drift and breathe.', mode:5, aspect:1 },
  film:     { id:'film', name:'Film', desc:'An analog film look: grain, halation, warm tone.', mode:6, aspect:1 },
  drift:    { id:'drift', name:'Drifting pixels', desc:'Dithered pixels that flow across the picture.', mode:7, aspect:1 },
};
export const STYLE_ORDER = Object.keys(STYLES) as StyleId[];

export const PALETTES: Record<string,{name:string;c:[string,string,string]}> = {
  green:  { name:'Phosphor', c:['#021a08','#12b84a','#b6ffc9'] },
  amber:  { name:'Amber',    c:['#1a0d00','#d97706','#ffe2a8'] },
  ice:    { name:'Ice',      c:['#06122b','#3b82f6','#e0f2ff'] },
  sunset: { name:'Sunset',   c:['#2b0f4a','#ff4d6d','#ffd166'] },
  neon:   { name:'Neon',     c:['#12002b','#ff2bd6','#2bf3ff'] },
  gameboy:{ name:'Gameboy',  c:['#0f380f','#306230','#9bbc0f'] },
  mono:   { name:'Mono',     c:['#000000','#808080','#ffffff'] },
};

export interface Params {
  style: StyleId; detail: number; contrast: number; brightness: number; invert: boolean;
  colorMode: 'mono'|'source'|'palette'; palette: string; fg: string; bg: string;
  outlines: number; glow: number; scanlines: number; crt: number; aberration: number; grain: number; flicker: number;
  rain: number; animate: boolean; speed: number; custom: string; transparent: boolean;
}

export const DEFAULTS: Params = {
  style:'classic', detail:110, contrast:1.15, brightness:0, invert:false,
  colorMode:'mono', palette:'green', fg:'#f4f4f7', bg:'#07070a',
  outlines:0, glow:0, scanlines:0, crt:0, aberration:0, grain:0, flicker:0,
  rain:0, animate:false, speed:1, custom:' .oO@', transparent:false,
};

export interface Preset { id:string; name:string; p: Partial<Params>; }
export const PRESETS: Preset[] = [
  { id:'classic', name:'Classic', p:{ style:'classic', detail:110 } },
  { id:'detailed', name:'Detailed colour', p:{ style:'detailed', detail:140, colorMode:'source', contrast:1.2 } },
  { id:'rain', name:'Digital rain', p:{ style:'binary', detail:90, colorMode:'palette', palette:'green', bg:'#000000', glow:45, rain:1, animate:true, contrast:1.3, brightness:0.05 } },
  { id:'monitor', name:'Old monitor', p:{ style:'classic', detail:100, colorMode:'palette', palette:'green', bg:'#020a04', scanlines:60, crt:70, glow:50, aberration:25, flicker:30, grain:15 } },
  { id:'amber', name:'Amber terminal', p:{ style:'detailed', detail:130, colorMode:'palette', palette:'amber', bg:'#120800', scanlines:40, crt:40, glow:40 } },
  { id:'bricks', name:'Brick mosaic', p:{ style:'bricks', detail:56, colorMode:'source', contrast:1.25, bg:'#101014' } },
  { id:'newspaper', name:'Newspaper', p:{ style:'dots', detail:80, colorMode:'mono', fg:'#16161a', bg:'#efe9da', invert:true, contrast:1.3 } },
  { id:'poster', name:'Poster halftone', p:{ style:'dots', detail:64, colorMode:'source', bg:'#0b0b10', contrast:1.35 } },
  { id:'onebit', name:'One-bit', p:{ style:'dither', detail:200, colorMode:'mono', fg:'#ffffff', bg:'#000000', contrast:1.2 } },
  { id:'gameboy', name:'Gameboy', p:{ style:'dither', detail:120, colorMode:'mono', fg:'#9bbc0f', bg:'#0f380f', contrast:1.2 } },
  { id:'noir', name:'Noir braille', p:{ style:'braille', detail:100, colorMode:'mono', fg:'#ffffff', bg:'#000000' } },
  { id:'braillecolour', name:'Braille colour', p:{ style:'braille', detail:110, colorMode:'source', contrast:1.25 } },
  { id:'blueprint', name:'Blueprint', p:{ style:'classic', detail:120, colorMode:'mono', fg:'#d7e8ff', bg:'#0b3a8a', outlines:80, contrast:1.3 } },
  { id:'sketch', name:'Sketch', p:{ style:'sparse', detail:130, colorMode:'mono', fg:'#23232a', bg:'#f5f1e8', invert:true, outlines:70, contrast:1.4 } },
  { id:'tiles', name:'Letter tiles', p:{ style:'letters', detail:70, colorMode:'source', contrast:1.2 } },
  { id:'swarm', name:'Particle swarm', p:{ style:'particles', detail:90, colorMode:'source', bg:'#05050a', glow:60, animate:true, contrast:1.3 } },
  { id:'film', name:'Vintage film', p:{ style:'film', detail:100, colorMode:'source', grain:55, flicker:20, crt:15, animate:true } },
  { id:'drift', name:'Pixel drift', p:{ style:'drift', detail:160, colorMode:'palette', palette:'sunset', bg:'#12061f', animate:true, contrast:1.2 } },
  { id:'neon', name:'Neon blocks', p:{ style:'blocks', detail:90, colorMode:'palette', palette:'neon', bg:'#08000f', glow:70, contrast:1.3 } },
];
export function applyPreset(base: Params, id: string): Params {
  const pr = PRESETS.find(x=>x.id===id);
  return { ...DEFAULTS, custom: base.custom, ...(pr?pr.p:{}) };
}
