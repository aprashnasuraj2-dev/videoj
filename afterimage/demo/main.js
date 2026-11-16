import { createAfterimagePlayer } from '../skin/player.js';
import './page.css';

const asset = path => new URL(path, document.baseURI).href;
const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.crossOrigin = 'anonymous';
video.poster = asset('./media/the-waterline-v1-poster.jpg');

for (const source of [
  { src: asset('./media/the-waterline-v1.webm'), type: 'video/webm; codecs="vp9, opus"' },
  { src: asset('./media/the-waterline-v1.mp4'), type: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' },
]) {
  const element = document.createElement('source');
  element.src = source.src;
  element.type = source.type;
  video.append(element);
}

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = asset('./media/the-waterline-v1.vtt');
video.append(captions);

const chapters = document.createElement('track');
chapters.kind = 'chapters';
chapters.srclang = 'en';
chapters.label = 'Waterline';
chapters.src = asset('./media/the-waterline-v1-chapters.vtt');
video.append(chapters);

document.querySelector('#afterimage-player').append(createAfterimagePlayer(video, {
  example: { pinnedSeconds: 5, currentSeconds: 13 },
}));
