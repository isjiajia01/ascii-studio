export const TILE_W = 32, TILE_H = 64;
const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
const BLOCKS: Record<string, number> = { '░': .25, '▒': .5, '▓': .75, '█': 1 };

export interface Atlas { canvas: HTMLCanvasElement; count: number; }

function drawGlyph(ctx: CanvasRenderingContext2D, ch: string, x: number) {
  if (BLOCKS[ch] !== undefined) {
    ctx.fillStyle = 'rgba(255,255,255,' + BLOCKS[ch] + ')';
    ctx.fillRect(x, 0, TILE_W, TILE_H);
    return;
  }
  ctx.fillStyle = '#fff';
  ctx.font = '600 52px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x + TILE_W / 2, TILE_H / 2 + 3);
}

function coverage(ch: string): number {
  const c = document.createElement('canvas'); c.width = TILE_W; c.height = TILE_H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  drawGlyph(ctx, ch, 0);
  const d = ctx.getImageData(0, 0, TILE_W, TILE_H).data;
  let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
  return s;
}

/** Build a one-row glyph atlas (alpha = ink). Last 4 tiles are edge glyphs: - / | \ */
export function buildAtlas(chars: string, sort: boolean): Atlas {
  let list = Array.from(new Set(Array.from(chars)));
  if (!list.includes(' ')) list.unshift(' ');
  if (list.length > 96) list = list.slice(0, 96);
  if (sort) {
    const cov = new Map(list.map(ch => [ch, ch === ' ' ? -1 : coverage(ch)] as const));
    list.sort((a, b) => cov.get(a)! - cov.get(b)!);
  }
  const total = list.length + 4;
  const canvas = document.createElement('canvas');
  canvas.width = total * TILE_W; canvas.height = TILE_H;
  const ctx = canvas.getContext('2d')!;
  list.forEach((ch, i) => { if (ch !== ' ') drawGlyph(ctx, ch, i * TILE_W); });
  const n = list.length;
  ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = 7;
  const seg = (i: number, x1: number, y1: number, x2: number, y2: number) => {
    const o = (n + i) * TILE_W; ctx.beginPath(); ctx.moveTo(o + x1, y1); ctx.lineTo(o + x2, y2); ctx.stroke();
  };
  seg(0, 4, 32, 28, 32);          // -
  seg(1, 6, 56, 26, 8);           // /
  seg(2, 16, 6, 16, 58);          // |
  seg(3, 6, 8, 26, 56);           // \
  return { canvas, count: n };
}
