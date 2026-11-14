import '@videojs/html/video/player';
import './video/skin';
import template from './video/skin.html?raw';

export interface DhagoWeaveChapter { start:number; end:number; color:string; threadPx:number; audioDb?:number|null }
export interface DhagoWeave { format:'dhago-weave-v1'; chapters:DhagoWeaveChapter[] }

export interface DhagoOptions {
  source: string;
  playbackId?: string;
  /** Optional compatible original source if the browser cannot decode H.264. */
  compatibilitySource?: string;
  fallbackUrl?: string;
  poster?: string;
  chapters?: string;
  captions?: string;
  /** Real, encoded-source storyboard. Mux supplies its own when active. */
  thumbnails?: string;
  surface?: 'warm' | 'dark' | 'minimal';
  mediaKind?: 'video' | 'audio';
  /** Optional offline-sampled real footage palette. No capture or processing at playback. */
  weave?: DhagoWeave;
}

let instance = 0;
/** Portable mount: no imports, globals or media from the demo are required. */
export function createDhagoPlayer(options: DhagoOptions): HTMLElement {
  const player = document.createElement('video-player');
  player.innerHTML = template;
  const container = player.querySelector('media-container')!;
  container.setAttribute('data-surface', options.surface ?? 'warm');
  if (options.mediaKind === 'audio') {
    container.setAttribute('data-preset', 'audio');
    container.setAttribute('data-audio-only', '');
  }
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
  if (options.playbackId && options.fallbackUrl) {
    const fallback = player.querySelector<HTMLAnchorElement>('.dhago-fallback')!;
    fallback.href = options.fallbackUrl;
    fallback.hidden = false;
  }

  // Playback must be possible in browsers compiled without H.264/AAC.
  // On browsers that do support the actual Mux H.264 rendition, preserve Mux
  // as the primary source and do not use the compatibility path silently.
  const capability = document.createElement('video');
  const h264 = capability.canPlayType('video/mp4; codecs="avc1.64001f, mp4a.40.2"');
  const webm = capability.canPlayType('video/webm; codecs="vp9, opus"');
  const useCompatibleOriginal = options.mediaKind !== 'audio' &&
    Boolean(options.compatibilitySource && !h264 && webm);
  const useMux = Boolean(options.playbackId && !useCompatibleOriginal);
  if (useCompatibleOriginal) container.setAttribute('data-compatibility-source', 'webm');
  // Keep the Mux HLS engine out of the local-film entry bundle.
  if (useMux) void import('@videojs/html/media/mux-video');
  const video = document.createElement(options.mediaKind === 'audio' ? 'audio' : (useMux ? 'mux-video' : 'video')) as HTMLVideoElement;
  if (useMux) video.setAttribute('src', `https://stream.mux.com/${options.playbackId}.m3u8`);
  else video.src = useCompatibleOriginal ? options.compatibilitySource! : options.source;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  // The Mux adapter derives a cross-origin storyboard track. Local text tracks
  // also remain usable when a host serves the film from a different CDN.
  video.setAttribute('crossorigin', 'anonymous');
  if (options.poster && options.mediaKind !== 'audio') video.setAttribute('poster', options.poster);
  for (const [kind,src,label] of [
    ['chapters',options.chapters,'English chapters'],
    ['captions',options.captions,'English descriptions'],
  ] as const) {
    if (!src) continue;
    const track = document.createElement('track');
    track.kind = kind; track.src = src; track.srclang = 'en'; track.label = label;
    track.default = kind === 'chapters'; video.append(track);
  }
  // Video.js v10 reads its local seek-preview frames from a genuine
  // metadata VTT track. Never overlay a local storyboard on another Mux film.
  if (!useMux && options.thumbnails) {
    const thumbnails=document.createElement('track');
    thumbnails.kind='metadata';
    thumbnails.label='thumbnails';
    thumbnails.src=options.thumbnails;
    thumbnails.default=true;
    video.append(thumbnails);
  }
  // A host can opt in to frame-derived color and audio-derived strand width.
  // Only apply a swatch when its exact authored cue boundaries match the
  // generated metadata. Never color a different video's unrelated chapters.
  let colored = false;
  let weaveObserver:MutationObserver|null = null;
  const applyWeave = () => {
    if (colored || options.weave?.format !== 'dhago-weave-v1') return;
    const list=container.querySelector<HTMLElement>('.media-time-slider-chapters');
    const elements=Array.from(list?.querySelectorAll<HTMLElement>('.media-time-slider-chapter')??[]);
    const cues=Array.from(
      (video.textTracks?Array.from(video.textTracks):[]).find(t=>t.kind==='chapters')?.cues??[]
    );
    if (!elements.length || cues.length !== elements.length || !options.weave.chapters.length) return;
    const pairs=cues.map((cue,i)=>{
      const match=options.weave!.chapters.find(s=>Math.abs(s.start-cue.startTime)<.06&&Math.abs(s.end-cue.endTime)<.06);
      return {node:elements[i],match};
    });
    if(pairs.some(p=>!p.match || !/^#[0-9a-f]{6}$/i.test(p.match.color) ||
      !Number.isFinite(p.match.threadPx)))return;
    pairs.forEach(({node,match})=>{
      node.style.setProperty('--dhago-weave-color',match!.color);
      node.style.setProperty('--dhago-weave-thread',Math.max(1,Math.min(4,match!.threadPx)).toFixed(2)+'px');
    });
    colored=true;
    container.setAttribute('data-weave-sampled','');
    weaveObserver?.disconnect();
    weaveObserver=null;
  };
  if(options.weave) {
    const chapterRoot=container.querySelector('.media-time-slider-chapters');
    if(chapterRoot) {
      weaveObserver=new MutationObserver(applyWeave);
      weaveObserver.observe(chapterRoot,{childList:true,subtree:true});
    }
    for(const type of ['loadedmetadata','durationchange','timeupdate'] as const)
      video.addEventListener(type,applyWeave);
    video.querySelectorAll('track').forEach(track=>track.addEventListener('load',applyWeave));
  }
  // Native <details> provides a keyboard/touch chapter picker inside the skin.
  // The time-slider remains the sole continuous seeking surface.
  const readout = player.querySelector<HTMLDetailsElement>('.dhago-chapter-readout')!;
  const summary = readout.querySelector<HTMLElement>('.dhago-chapter-summary')!;
  const chapterIndex = readout.querySelector<HTMLElement>('.dhago-chapter-index')!;
  const chapterName = readout.querySelector<HTMLElement>('.dhago-chapter-name')!;
  const chapterList = readout.querySelector<HTMLOListElement>('.dhago-chapter-list')!;
  let displayedChapter = '';
  let cueFingerprint = '';
  const displayTime = (seconds: number): string => {
    const whole = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor(whole / 60) % 60;
    const tail = String(whole % 60).padStart(2, '0');
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}`
      : `${minutes}:${tail}`;
  };
  const updateChapter = () => {
    // Text tracks can be unavailable until the async Mux element upgrades.
    const tracks = video.textTracks ? Array.from(video.textTracks) : [];
    const track = tracks.find(t => t.kind === 'chapters');
    // WebVTT is the source of truth. Invalid zero-length cues are excluded;
    // external producers' overlapping/gapped cues are not silently rewritten.
    const cues = Array.from(track?.cues ?? [])
      .filter(c => Number.isFinite(c.startTime) && Number.isFinite(c.endTime) &&
        c.startTime >= 0 && c.endTime > c.startTime)
      .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
    const fingerprint = cues.map(c => `${c.startTime}:${c.endTime}:${(c as VTTCue).text}`).join('\u001e');
    container.toggleAttribute('data-hour-clock', video.duration >= 3600);

    if (fingerprint !== cueFingerprint) {
      cueFingerprint = fingerprint;
      readout.open = false;
      const fragment = document.createDocumentFragment();
      cues.forEach((cue, i) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dhago-chapter-jump';
        button.dataset.chapterTime = String(cue.startTime);
        const number = document.createElement('span');
        number.className = 'dhago-jump-number';
        number.textContent = String(i + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'dhago-jump-name';
        name.dir = 'auto';
        name.textContent = (cue as VTTCue).text;
        name.title = (cue as VTTCue).text;
        const stamp = document.createElement('time');
        stamp.className = 'dhago-jump-time';
        stamp.textContent = displayTime(cue.startTime);
        button.append(number, name, stamp);
        item.append(button);
        fragment.append(item);
      });
      chapterList.replaceChildren(fragment);
    }
    // Gaps remain visibly unmarked. At exactly the film endpoint keep the
    // final chapter so the end/replay state does not flicker.
    const time = video.currentTime;
    const nearEnd = Number.isFinite(video.duration) && video.duration > 0 &&
      time >= video.duration - 0.05;
    const index = cues.findIndex((cue, i) =>
      (time >= cue.startTime && time < cue.endTime) ||
      (i === cues.length - 1 && nearEnd && time >= cue.startTime)
    );
    const label = index < 0 ? 'Unmarked passage' : (cues[index] as VTTCue).text;
    const signature = `${index}/${cues.length}/${label}`;
    if (signature === displayedChapter) return;
    displayedChapter = signature;
    readout.hidden = cues.length === 0;
    if (!cues.length) {
      readout.open = false;
      return;
    }
    chapterIndex.textContent = index < 0
      ? 'BETWEEN CHAPTERS'
      : `CHAPTER ${String(index + 1).padStart(2, '0')} / ${String(cues.length).padStart(2, '0')}`;
    chapterName.textContent = label;
    chapterName.title = label;
    chapterList.querySelectorAll<HTMLButtonElement>('.dhago-chapter-jump')
      .forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
  };
  chapterList.addEventListener('click', (event) => {
    const origin = event.target;
    if (!(origin instanceof Element)) return;
    const button = origin.closest<HTMLButtonElement>('button[data-chapter-time]');
    if (!button || !chapterList.contains(button)) return;
    const requested = Number(button.dataset.chapterTime);
    if (!Number.isFinite(requested) || requested < 0) return;
    // For DVR-like media seek only inside the actual available window.
    const ranges = video.seekable;
    let target = requested;
    if (ranges?.length) {
      const start = ranges.start(0);
      const end = ranges.end(ranges.length - 1);
      target = Math.max(start, Math.min(target, end));
    } else if (Number.isFinite(video.duration) && video.duration > 0) {
      target = Math.min(requested, video.duration);
    } else return;
    video.currentTime = target;
    readout.open = false;
    summary.focus();
    updateChapter();
  });
  readout.addEventListener('keydown', event => {
    if (event.key === 'Escape' && readout.open) {
      readout.open = false;
      summary.focus();
      event.stopPropagation();
      event.preventDefault();
    }
  });
  video.addEventListener('timeupdate', updateChapter);
  video.addEventListener('loadedmetadata', updateChapter);
  video.addEventListener('ended', updateChapter);
  // The woven drag effect is driven by Video.js' native [data-dragging]
  // state on <media-time-slider>; do not add competing pointer handlers.
  // This preserves touch capture, keyboard seeking and cancellation behavior.

  // Three distinct states; all are triggered by real media events.
  // Native Video.js buffering indicators remain authoritative.
  const setWaiting = (isStalled: boolean) => {
    if (!video.paused && !video.ended && !video.error) {
      container.setAttribute('data-thread-buffering', '');
      container.toggleAttribute('data-thread-stalled', isStalled);
    }
  };
  const clearWaiting = () => {
    container.removeAttribute('data-thread-buffering');
    container.removeAttribute('data-thread-stalled');
  };
  video.addEventListener('waiting', () => setWaiting(false));
  video.addEventListener('stalled', () => setWaiting(true));
  const clearSeeking = () => container.removeAttribute('data-thread-seeking');
  video.addEventListener('seeking', () => {
    container.setAttribute('data-thread-seeking', '');
    clearWaiting();
  });
  video.addEventListener('seeked', clearSeeking);
  for (const event of ['playing', 'canplay', 'seeked', 'pause', 'ended', 'error', 'emptied']) {
    video.addEventListener(event, clearWaiting);
  }
  for (const event of ['error', 'emptied', 'ended']) video.addEventListener(event, clearSeeking);
  video.querySelectorAll('track').forEach(t => t.addEventListener('load', updateChapter));
  // Host applications may append chapters after media metadata has loaded.
  // Do not freeze the chapter name at the empty initial track list.
  // mux-video is registered asynchronously: its textTracks accessor can be
  // unavailable until the custom element upgrades. A native video/audio
  // element has the list immediately; the other media events still update cues.
  video.textTracks?.addEventListener('addtrack', event => {
    event.track?.addEventListener('cuechange', updateChapter);
    updateChapter();
  });
  player.querySelector('.dhago-retry')?.addEventListener('click',()=>{
    // A deliberate user retry, never an automatic loop or silent fallback.
    player.querySelector<HTMLElement>('media-dialog-close')?.click();
    video.load();
    player.querySelector<HTMLElement>('media-play-button')?.focus();
  });
  container.prepend(video);
  return player;
}
