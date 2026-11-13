import '@videojs/html/video/player';
import './video/skin';
import template from './video/skin.html?raw';

export interface DhagoOptions {
  source: string;
  playbackId?: string;
  poster?: string;
  chapters?: string;
  captions?: string;
  surface?: 'warm' | 'dark' | 'minimal';
}

let instance = 0;
/** Portable mount: no imports, globals or media from the demo are required. */
export function createDhagoPlayer(options: DhagoOptions): HTMLElement {
  const player = document.createElement('video-player');
  player.innerHTML = template;
  const container = player.querySelector('media-container')!;
  container.setAttribute('data-surface', options.surface ?? 'warm');
  const suffix = `-dhago-${++instance}`;
  const ids = new Map<string,string>();
  player.querySelectorAll<HTMLElement>('[id]').forEach(el => {
    ids.set(el.id,el.id+suffix); el.id += suffix;
  });
  for (const attr of ['trigger','commandfor','aria-controls','aria-labelledby']) {
    player.querySelectorAll<HTMLElement>(`[${attr}]`).forEach(el => {
      const value = el.getAttribute(attr)!;
      el.setAttribute(attr,value.split(' ').map(id => ids.get(id) ?? id).join(' '));
    });
  }
  // Keep the HLS engine out of the local-film entry bundle. Custom elements
  // upgrade the declarative attributes when the optional adapter finishes loading.
  if (options.playbackId) void import('@videojs/html/media/mux-video');
  const video = document.createElement(options.playbackId ? 'mux-video' : 'video') as HTMLVideoElement;
  if (options.playbackId) video.setAttribute('src', `https://stream.mux.com/${options.playbackId}.m3u8`);
  else video.src = options.source;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  // The Mux adapter derives a cross-origin storyboard track. Local text tracks
  // also remain usable when a host serves the film from a different CDN.
  video.setAttribute('crossorigin', 'anonymous');
  if (options.poster) video.setAttribute('poster', options.poster);
  for (const [kind,src,label] of [
    ['chapters',options.chapters,'English chapters'],
    ['captions',options.captions,'English descriptions'],
  ] as const) {
    if (!src) continue;
    const track = document.createElement('track');
    track.kind = kind; track.src = src; track.srclang = 'en'; track.label = label;
    track.default = kind === 'chapters'; video.append(track);
  }
  // Read real chapter cues; no duplicated timer or invented chapter state.
  const readout = player.querySelector<HTMLElement>('.dhago-chapter-readout')!;
  const updateChapter = () => {
    const track = Array.from(video.textTracks).find(t => t.kind === 'chapters');
    const cues = Array.from(track?.cues ?? []);
    const index = cues.findIndex(c => video.currentTime >= c.startTime && video.currentTime < c.endTime);
    readout.hidden = index < 0;
    if (index < 0) return;
    readout.querySelector('.dhago-chapter-index')!.textContent = `CHAPTER ${String(index + 1).padStart(2, '0')} / ${String(cues.length).padStart(2, '0')}`;
    readout.querySelector('.dhago-chapter-name')!.textContent = (cues[index] as VTTCue).text;
  };
  video.addEventListener('timeupdate', updateChapter);
  video.addEventListener('loadedmetadata', updateChapter);
  video.querySelectorAll('track').forEach(t => t.addEventListener('load', updateChapter));
  container.prepend(video);
  return player;
}
