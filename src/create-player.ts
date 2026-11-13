import '@videojs/html/video/player';
import './video/skin';
import template from './video/skin.html?raw';

export interface DhagoOptions {
  source: string;
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
  const video = document.createElement('video');
  video.src = options.source;
  video.playsInline = true;
  video.preload = 'metadata';
  if (options.poster) video.poster = options.poster;
  for (const [kind,src,label] of [
    ['chapters',options.chapters,'English chapters'],
    ['captions',options.captions,'English descriptions'],
  ] as const) {
    if (!src) continue;
    const track = document.createElement('track');
    track.kind = kind; track.src = src; track.srclang = 'en'; track.label = label;
    track.default = kind === 'chapters'; video.append(track);
  }
  container.prepend(video);
  return player;
}
