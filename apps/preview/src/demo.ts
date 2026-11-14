import { createDhagoPlayer, type DhagoWeave } from '@/create-player';
import sampledWeave from './weave-studies.json';
import fibreWeave from './weave-fibre.json';
import './demo.css';
import media from './media.json';
import fibreMedia from './media-fibre.json';

const query = new URLSearchParams(location.search);
const allowed = ['warm','dark','minimal'] as const;
const fibrePreview = query.get('film') === 'fibre';
const surface = allowed.find(x=>x===query.get('surface')) ?? 'warm';
const fallback = new URL(location.href);
fallback.searchParams.set('local', '');
const player = createDhagoPlayer({
  source: fibrePreview ? './media/from-fibre-to-fabric.mp4' : './media/studies-in-thread.mp4',
  compatibilitySource: fibrePreview ? './media/from-fibre-to-fabric.webm' : './media/studies-in-thread.webm',
  weave: (fibrePreview ? fibreWeave : sampledWeave) as DhagoWeave,
  playbackId: query.has('local') ? undefined : (fibrePreview ? fibreMedia.playbackId ?? undefined : media.playbackId ?? undefined),
  fallbackUrl: fallback.href,
  poster: fibrePreview ? './media/from-fibre-to-fabric-poster.webp' : './media/poster.webp',
  chapters: query.has('nochapters') ? undefined : (fibrePreview ? './media/from-fibre-to-fabric-chapters.vtt' : './media/chapters.vtt'),
  captions: fibrePreview ? './media/from-fibre-to-fabric-captions.vtt' : './media/captions.vtt',
  thumbnails: fibrePreview ? './media/from-fibre-to-fabric-storyboard.vtt' : undefined,
  surface,
});
const mount=document.querySelector<HTMLElement>('#player-mount')!;
mount.append(player);
if (fibrePreview) {
  const filmName=document.querySelector<HTMLElement>('.film-name');
  if(filmName) filmName.textContent='FROM FIBRE TO FABRIC — A DHAGO FILM';
  const headings=['Raw fibre','Twist into thread','Warp meets weft','Cloth holds time'];
  document.querySelectorAll<HTMLElement>('.chapter-title').forEach((node,i)=>{
    if(headings[i]) node.textContent=headings[i];
  });
  document.querySelector('[aria-label="Watch Studies in thread"]')
    ?.setAttribute('aria-label','Watch From Fibre to Fabric');
  // The candidate's source is local. The old Mux public playback ID belongs
  // to a different movie and must never be represented as this film's stream.
  const proof=document.querySelector<HTMLElement>('.resilience-proof');
  if (proof) proof.textContent=fibreMedia.playbackId ? 'Original fibre-to-fabric film candidate · Mux playback · Video.js v10 · Original VP9 compatibility' : 'Original fibre-to-fabric film candidate · Local encoded media · New Mux publication pending';
}
const video=player.querySelector<HTMLVideoElement>('video, mux-video')!;
const seekButtons = document.querySelectorAll<HTMLButtonElement>('[data-seek]');
seekButtons.forEach(button=>button.addEventListener('click',()=>{
  if (!Number.isFinite(video.duration)) return;
  video.currentTime = Math.min(Number(button.dataset.seek),video.duration);
  player.querySelector<HTMLElement>('media-time-slider media-slider-thumb')?.focus();
}));
// Chapter cards follow declared seek boundaries, including the final frame.
const chapterStarts=Array.from(seekButtons,button=>Number(button.dataset.seek));
if(query.has('nochapters'))document.querySelector('.chapter-list')?.setAttribute('hidden','');
const syncCards=()=>{
  if(query.has('nochapters'))return;
  seekButtons.forEach((button,i)=>{
    const active=video.currentTime>=chapterStarts[i] &&
      (i===seekButtons.length-1 || video.currentTime<chapterStarts[i+1]);
    if(active)button.setAttribute('aria-current','true');
    else button.removeAttribute('aria-current');
  });
};
for(const event of ['loadedmetadata','timeupdate','ended'] as const)
  video.addEventListener(event,syncCards);
syncCards();
document.querySelectorAll<HTMLButtonElement>('[data-surface-choice]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.surfaceChoice===surface));
  button.addEventListener('click',()=>{
    const value=button.dataset.surfaceChoice!;
    player.querySelector('media-container')!.setAttribute('data-surface',value);
    document.querySelectorAll('[data-surface-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    const url=new URL(location.href);url.searchParams.set('surface',value);history.replaceState(null,'',url);
  });
});
document.querySelector('#size-toggle')?.addEventListener('click',e=>{
  const target=e.currentTarget as HTMLButtonElement;
  const compact=target.getAttribute('aria-pressed')!=='true';
  target.setAttribute('aria-pressed',String(compact));
  mount.classList.toggle('compact',compact);
});
