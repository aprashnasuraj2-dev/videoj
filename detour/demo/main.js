import { createDetourPlayer } from '../skin/player.js';
import './page.css';

const params = new URLSearchParams(location.search);
const fixtureMode = params.get('fixture') === 'navigation-study';
const mediaRoot = fixtureMode ? 'fixtures/navigation-study' : 'showcase/detour-showcase-v1';

const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.src = new URL(`${mediaRoot}.mp4`, document.baseURI).href;
if (!fixtureMode) video.poster = new URL(`${mediaRoot}-poster.jpg`, document.baseURI).href;

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = new URL(`${mediaRoot}.vtt`, document.baseURI).href;
video.append(captions);

document.querySelector('#example').append(createDetourPlayer(video, { sourceKind: 'vod' }));
