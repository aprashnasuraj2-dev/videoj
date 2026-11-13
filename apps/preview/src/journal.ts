import { createDhagoPlayer } from '@/create-player';
import media from './media.json';
import './demo.css';
import './journal.css';

const player=createDhagoPlayer({source:'./media/studies-in-thread.mp4',playbackId:new URLSearchParams(location.search).has('local')?undefined:media.playbackId??undefined,poster:'./media/poster.webp',chapters:'./media/chapters.vtt',captions:'./media/captions.vtt',surface:'dark'});
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
