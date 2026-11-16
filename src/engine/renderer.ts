import { buildAtlas } from './glyphs';
import { STYLES, PALETTES, type Params } from './styles';
import { VERT, ASCII_FRAG, POST_FRAG } from './shaders';

export type SourceEl = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

function hex(h: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(h) || ['', '000000'];
  const n = parseInt(m[1], 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

class Prog {
  p: WebGLProgram; loc = new Map<string, WebGLUniformLocation | null>();
  constructor(public gl: WebGL2RenderingContext, fs: string) {
    const mk = (t: number, s: string) => {
      const sh = gl.createShader(t)!; gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader error');
      return sh;
    };
    this.p = gl.createProgram()!;
    gl.attachShader(this.p, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(this.p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(this.p);
    if (!gl.getProgramParameter(this.p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.p) || 'link error');
  }
  u(n: string) { if (!this.loc.has(n)) this.loc.set(n, this.gl.getUniformLocation(this.p, n)); return this.loc.get(n)!; }
  f(n: string, v: number) { this.gl.uniform1f(this.u(n), v); }
  i(n: string, v: number) { this.gl.uniform1i(this.u(n), v); }
  v2(n: string, a: number, b: number) { this.gl.uniform2f(this.u(n), a, b); }
  v3(n: string, c: number[]) { this.gl.uniform3f(this.u(n), c[0], c[1], c[2]); }
}

export class Renderer {
  canvas: HTMLCanvasElement; gl: WebGL2RenderingContext;
  private A: Prog; private P: Prog;
  private srcTex: WebGLTexture; private atlasTex: WebGLTexture; private fboTex: WebGLTexture; private fbo: WebGLFramebuffer;
  private fw = 0; private fh = 0; private atlasKey = ''; private atlasCount = 1;
  private src: SourceEl | null = null; private srcW = 1; private srcH = 1; private dirty = false; private isVideo = false;

  static supported(): boolean {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
  }

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.A = new Prog(gl, ASCII_FRAG); this.P = new Prog(gl, POST_FRAG);
    const tex = () => {
      const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      return t;
    };
    this.srcTex = tex(); this.atlasTex = tex(); this.fboTex = tex();
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    this.fbo = gl.createFramebuffer()!;
  }

  setSource(el: SourceEl, w: number, h: number) {
    this.src = el; this.srcW = w; this.srcH = h; this.dirty = true;
    this.isVideo = typeof HTMLVideoElement !== 'undefined' && el instanceof HTMLVideoElement;
  }
  get hasSource() { return !!this.src; }

  private upload() {
    const gl = this.gl; if (!this.src) return;
    if (this.isVideo && (this.src as HTMLVideoElement).readyState < 2) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src as TexImageSource);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.dirty = false;
  }

  private ensureAtlas(p: Params) {
    const st = STYLES[p.style];
    const chars = p.style === 'custom' ? (p.custom || ' .oO@') : (st.chars || ' ');
    const key = p.style + '|' + chars;
    if (key === this.atlasKey) return;
    const a = buildAtlas(chars, !!st.sort);
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a.canvas);
    this.atlasKey = key; this.atlasCount = a.count;
  }

  private ensureFbo(w: number, h: number) {
    if (w === this.fw && h === this.fh) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    this.fw = w; this.fh = h;
  }

  /** Render at w x h. t = seconds (already scaled by caller if desired). */
  render(p: Params, w: number, h: number, t: number) {
    const gl = this.gl; if (!this.src) return;
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (this.dirty || this.isVideo) this.upload();
    this.ensureAtlas(p); this.ensureFbo(w, h);
    const st = STYLES[p.style];
    const tr = p.transparent;
    const cellW = w / Math.max(8, p.detail), cellH = cellW * st.aspect;
    const pal = PALETTES[p.palette] || PALETTES.green;

    gl.disable(gl.BLEND);
    // pass 1: ascii -> fbo
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo); gl.viewport(0, 0, w, h);
    const A = this.A; gl.useProgram(A.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    A.i('uSrc', 0); A.i('uAtlas', 1);
    A.v2('uRes', w, h); A.v2('uCell', cellW, cellH); A.v2('uSrcSize', this.srcW, this.srcH);
    A.i('uMode', st.mode); A.i('uGlyphs', this.atlasCount); A.f('uTiles', this.atlasCount + 4);
    A.i('uColorMode', p.colorMode === 'source' ? 1 : p.colorMode === 'palette' ? 2 : 0);
    A.f('uTone', st.tone || 1); A.f('uShade', st.shade || 0); A.f('uRandom', st.random ? 1 : 0); A.f('uTileBg', st.tile ? 1 : 0);
    A.v3('uFg', hex(p.fg)); A.v3('uBg', hex(p.bg));
    A.v3('uP0', hex(pal.c[0])); A.v3('uP1', hex(pal.c[1])); A.v3('uP2', hex(pal.c[2]));
    A.f('uBgAlpha', tr ? 0 : 1); A.f('uContrast', p.contrast); A.f('uBright', p.brightness); A.f('uInvert', p.invert ? 1 : 0);
    A.f('uEdge', p.outlines / 100); A.f('uTime', t * p.speed); A.f('uRain', p.rain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex); gl.generateMipmap(gl.TEXTURE_2D);

    // pass 2: post -> canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
    const P = this.P; gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    P.i('uTex', 0); P.v2('uRes', w, h);
    const z = tr ? 0 : 1;
    P.f('uGlow', p.glow / 100 * z); P.f('uScan', p.scanlines / 100 * z); P.f('uCrt', p.crt / 100 * z);
    P.f('uAb', p.aberration / 100 * z); P.f('uGrain', p.grain / 100 * z); P.f('uFlick', p.flicker / 100 * z);
    P.f('uTime', t * p.speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/** Longest edge -> even w,h that keep aspect. */
export function fitSize(aspect: number, longEdge: number): [number, number] {
  let w: number, h: number;
  if (aspect >= 1) { w = longEdge; h = longEdge / aspect; } else { h = longEdge; w = longEdge * aspect; }
  return [Math.max(2, Math.round(w / 2) * 2), Math.max(2, Math.round(h / 2) * 2)];
}
