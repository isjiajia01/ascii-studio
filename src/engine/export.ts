import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Renderer, fitSize, type SourceEl } from './renderer';
import type { Params } from './styles';

export function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function exportImage(src: SourceEl, sw: number, sh: number, p: Params, longEdge: number,
  fmt: 'jpeg' | 'webp', t: number): Promise<{ blob: Blob; ext: string }> {
  const r = new Renderer();
  r.setSource(src, sw, sh);
  const [w, h] = fitSize(sw / sh, longEdge);
  r.render({ ...p, transparent: fmt === 'webp' && p.transparent }, w, h, t);
  const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
  const blob: Blob = await new Promise((res, rej) => r.canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), mime, 0.93));
  r.gl.getExtension('WEBGL_lose_context')?.loseContext();
  return { blob, ext: blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png' };
}

export const videoExportSupported = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(res => {
    if (Math.abs(v.currentTime - t) < 1e-3 && v.readyState >= 2) return res();
    const done = () => { v.removeEventListener('seeked', done); res(); };
    v.addEventListener('seeked', done); v.currentTime = t;
  });
}

export async function exportVideo(video: HTMLVideoElement, p: Params, longEdge: number,
  onProgress: (f: number) => void, signal: AbortSignal): Promise<Blob> {
  if (!videoExportSupported()) throw new Error('This browser has no WebCodecs; try Chrome, Edge or Safari 16.4+.');
  const fps = 30;
  const duration = Math.min(video.duration || 0, 60);
  if (!isFinite(duration) || duration <= 0) throw new Error('Video has no duration.');
  const frames = Math.max(1, Math.floor(duration * fps));
  const sw = video.videoWidth, sh = video.videoHeight;
  const [w, h] = fitSize(sw / sh, longEdge);
  const was = !video.paused; video.pause();

  const base = { width: w, height: h, framerate: fps, bitrate: Math.round(w * h * fps * 0.1) };
  const codecs = ['avc1.640034', 'avc1.64002A', 'avc1.4d0034', 'avc1.42001f'];
  let cfg: VideoEncoderConfig | null = null;
  for (const codec of codecs) {
    const c = { ...base, codec };
    try { const s = await VideoEncoder.isConfigSupported(c); if (s.supported) { cfg = c; break; } } catch { /* next */ }
  }
  if (!cfg) throw new Error('No H.264 encoder available at ' + w + 'x' + h + '. Try a smaller size.');

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h }, fastStart: 'in-memory' });
  let err: unknown = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { err = e; } });
  enc.configure(cfg);
  const r = new Renderer();
  r.setSource(video, sw, sh);
  const pp = { ...p, transparent: false };
  try {
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (err) throw err;
      const t = i / fps;
      await seek(video, Math.min(t, duration - 0.001));
      r.render(pp, w, h, t);
      const f = new VideoFrame(r.canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) });
      enc.encode(f, { keyFrame: i % 60 === 0 }); f.close();
      while (enc.encodeQueueSize > 6) await new Promise(res => setTimeout(res, 4));
      if (i % 3 === 0) { onProgress((i + 1) / frames); await new Promise(res => setTimeout(res, 0)); }
    }
    await enc.flush(); muxer.finalize();
    onProgress(1);
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    try { enc.close(); } catch { /* closed */ }
    r.gl.getExtension('WEBGL_lose_context')?.loseContext();
    video.currentTime = 0; if (was) void video.play();
  }
}
