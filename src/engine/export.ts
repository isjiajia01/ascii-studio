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
  try {
    r.setSource(src, sw, sh);
    const [w, h] = fitSize(sw / sh, longEdge);
    r.render({ ...p, transparent: fmt === 'webp' && p.transparent }, w, h, t);
    if (r.gl.isContextLost()) throw new Error('Graphics context lost during export. Try again at a smaller size.');
    const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const blob: Blob = await new Promise((res, rej) => r.canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), mime, 0.93));
    return { blob, ext: blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png' };
  } finally { r.dispose(); }
}

export const videoExportSupported = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

function seek(v: HTMLVideoElement, t: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    if (!v.seeking && Math.abs(v.currentTime - t) < 1e-6 && v.readyState >= 2) return resolve();
    const finish = (error?: Error) => {
      clearTimeout(timer); v.removeEventListener('seeked', done); v.removeEventListener('error', failed);
      signal?.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve();
    };
    const done = () => v.readyState >= 2 ? finish() : failed();
    const failed = () => finish(new Error('Unable to decode video frame.'));
    const aborted = () => finish(new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Video seek timed out.')), 15000);
    v.addEventListener('seeked', done); v.addEventListener('error', failed);
    signal?.addEventListener('abort', aborted, { once: true });
    try { v.currentTime = t; } catch (error) { finish(error as Error); }
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
  const was = !video.paused, originalTime = video.currentTime;

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
  let r: Renderer | null = null;
  const pp = { ...p, transparent: false };
  try {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    video.pause(); enc.configure(cfg);
    r = new Renderer(); r.setSource(video, sw, sh);
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (err) throw err;
      const t = i / fps;
      await seek(video, Math.min(t, duration - 0.001), signal);
      r.render(pp, w, h, t);
      if (r.gl.isContextLost()) throw new Error('Graphics context lost during export. Try again at a smaller size.');
      const f = new VideoFrame(r.canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) });
      try { enc.encode(f, { keyFrame: i % 60 === 0 }); } finally { f.close(); }
      const queuedAt = performance.now();
      // At 4K each queued raw frame can retain tens of MB.
      while (enc.encodeQueueSize > 2) {
        if (err) throw err;
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (performance.now() - queuedAt > 30000) throw new Error('Video encoder stalled. Try a smaller output size.');
        await new Promise(res => setTimeout(res, 4));
      }
      if (i % 3 === 0) { onProgress((i + 1) / frames); await new Promise(res => setTimeout(res, 0)); }
    }
    await enc.flush();
    if (err) throw err;
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    muxer.finalize();
    onProgress(1);
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    try { enc.close(); } catch { /* closed */ }
    r?.dispose();
    try { await seek(video, originalTime); } catch { /* source may have been removed */ }
    if (was) void video.play().catch(() => { /* browser may require another gesture */ });
  }
}
