import { createDetourPlayer } from '../skin/player.js';
import './page.css';

const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.src = new URL('fixtures/navigation-study.mp4', document.baseURI).href;

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = new URL('fixtures/navigation-study.vtt', document.baseURI).href;
video.append(captions);

document.querySelector('#example').append(createDetourPlayer(video, { sourceKind: 'vod' }));
