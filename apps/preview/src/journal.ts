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
video.addEventListener('timeupdate',()=>notes.forEach((note,i)=>{
 if(video.currentTime>=i*16&&video.currentTime<(i+1)*16)note.setAttribute('aria-current','true');else note.removeAttribute('aria-current');
}));
