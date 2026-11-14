import { createDhagoPlayer, type DhagoWeave } from '@/create-player';
import sampledWeave from './weave-studies.json';
import './demo.css';

const query = new URLSearchParams(location.search);
const allowed = ['warm','dark','minimal'] as const;
const surface = allowed.find(x=>x===query.get('surface')) ?? 'warm';
const player = createDhagoPlayer({
  source: './media/from-fibre-to-fabric.mp4',
  compatibilitySource: './media/from-fibre-to-fabric.webm',
  weave: sampledWeave as DhagoWeave,
  poster: './media/from-fibre-to-fabric-poster.webp',
  chapters: query.has('nochapters') ? undefined : './media/from-fibre-to-fabric-chapters.vtt',
  captions: './media/from-fibre-to-fabric-captions.vtt',
  surface,
});
const mount=document.querySelector<HTMLElement>('#player-mount')!;
mount.append(player);
const video=player.querySelector<HTMLVideoElement>('video, mux-video')!;
const seekButtons = document.querySelectorAll<HTMLButtonElement>('[data-seek]');
seekButtons.forEach(button=>button.addEventListener('click',()=>{
  if (!Number.isFinite(video.duration)) return;
  video.currentTime = Math.min(Number(button.dataset.seek),video.duration);
  player.querySelector<HTMLElement>('media-time-slider media-slider-thumb')?.focus();
}));
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
