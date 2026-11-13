import { createDhagoPlayer } from '@/create-player';
import './demo.css';

const query = new URLSearchParams(location.search);
const allowed = ['warm','dark','minimal'] as const;
const surface = allowed.find(x=>x===query.get('surface')) ?? 'warm';
const player = createDhagoPlayer({
  source: './media/studies-in-thread.mp4',
  poster: './media/poster.webp',
  chapters: query.has('nochapters') ? undefined : './media/chapters.vtt',
  captions: './media/captions.vtt',
  surface,
});
const mount=document.querySelector<HTMLElement>('#player-mount')!;
mount.append(player);
const video=player.querySelector('video')!;
const seekButtons = document.querySelectorAll<HTMLButtonElement>('[data-seek]');
seekButtons.forEach(button=>button.addEventListener('click',()=>{
  if (!Number.isFinite(video.duration)) return;
  video.currentTime = Math.min(Number(button.dataset.seek),video.duration);
  player.querySelector<HTMLElement>('media-time-slider')?.focus();
}));
video.addEventListener('timeupdate',()=>{
  seekButtons.forEach((button,i)=>{
    const active=video.currentTime >= i*16 && video.currentTime < (i+1)*16;
    if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
  });
});
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
