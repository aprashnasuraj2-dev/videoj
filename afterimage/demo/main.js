import { createAfterimagePlayer } from '../skin/player.js';
import './page.css';

const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.crossOrigin = 'anonymous';
video.poster = new URL('./poster.svg', import.meta.url).href;
video.src = 'https://vjs.zencdn.net/v/oceans.mp4';

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = new URL('./captions.vtt', import.meta.url).href;
video.append(captions);

document.querySelector('#afterimage-player').append(createAfterimagePlayer(video));
