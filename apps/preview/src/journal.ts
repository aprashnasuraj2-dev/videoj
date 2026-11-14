import { createDhagoPlayer, type DhagoWeave } from '@/create-player';
import sampledWeave from './weave-studies.json';
import media from './media.json';
import './demo.css';
import './journal.css';

const fallback = new URL(location.href);
fallback.searchParams.set('local', '');
const player = createDhagoPlayer({
  source: './media/from-fibre-to-fabric.mp4',
  compatibilitySource: './media/from-fibre-to-fabric.webm',
  weave: sampledWeave as DhagoWeave,
  playbackId: new URLSearchParams(location.search).has('local') ? undefined : media.playbackId ?? undefined,
  fallbackUrl: fallback.href,
  poster: './media/from-fibre-to-fabric-poster.webp',
  chapters: './media/from-fibre-to-fabric-chapters.vtt',
  captions: './media/from-fibre-to-fabric-captions.vtt',
  surface: 'dark',
});
document.querySelector('#journal-player')!.append(player);
const video=player.querySelector<HTMLVideoElement>('video,mux-video')!;
const notes=document.querySelectorAll<HTMLButtonElement>('[data-time]');
notes.forEach(note=>note.addEventListener('click',()=>{
 if(!Number.isFinite(video.duration))return;
 video.pause();video.currentTime=Math.min(Number(note.dataset.time),video.duration);
 player.querySelector<HTMLElement>('media-time-slider media-slider-thumb')?.focus();
}));
const starts=Array.from(notes,note=>Number(note.dataset.time));
const syncNotes=()=>notes.forEach((note,i)=>{
 const active=video.currentTime>=starts[i] &&
   (i===notes.length-1||video.currentTime<starts[i+1]);
 if(active)note.setAttribute('aria-current','true');
 else note.removeAttribute('aria-current');
});
for(const event of ['loadedmetadata','timeupdate','ended'] as const)
  video.addEventListener(event,syncNotes);
syncNotes();

const sizeBadge=document.querySelector<HTMLElement>('#dhago-size-badge');
const sizeNote=document.querySelector<HTMLElement>('#dhago-size-note');
if(sizeBadge){
  fetch('./dhago-size.json',{cache:'no-store'})
    .then(response=>response.ok?response.json():Promise.reject(new Error('size report unavailable')))
    .then(report=>{
      const layer=report.portableAuthoredLayer;
      if(!layer?.gzipBytes||!layer?.brotliBytes)throw new Error('portable size fields unavailable');
      sizeBadge.textContent=`DHAGO authored layer · ${(layer.gzipBytes/1024).toFixed(1)} kB gzip · ${(layer.brotliBytes/1024).toFixed(1)} kB br`;
      if(sizeNote)sizeNote.textContent='Measured at build time from DHAGO-authored CSS, TypeScript and template source; Video.js runtime, demo app, media and screenshots excluded.';
    })
    .catch(()=>{
      sizeBadge.textContent='DHAGO authored layer · measured in release artifact';
      if(sizeNote)sizeNote.textContent='See dhago-size.json in the verified release for exact raw, gzip and brotli bytes.';
    });
}
