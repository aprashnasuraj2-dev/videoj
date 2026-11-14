import { createDhagoPlayer } from '@/create-player';

export function createPlayer(): HTMLElement {
 return createDhagoPlayer({
  source:'./media/from-fibre-to-fabric.mp4',
  compatibilitySource:'./media/from-fibre-to-fabric.webm',
  poster:'./media/from-fibre-to-fabric-poster.webp',
  chapters:'./media/from-fibre-to-fabric-chapters.vtt',
  captions:'./media/from-fibre-to-fabric-captions.vtt',
 });
}
