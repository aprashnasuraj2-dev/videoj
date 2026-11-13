import { createDhagoPlayer } from '@/create-player';

export function createPlayer(): HTMLElement {
 return createDhagoPlayer({ source:'./media/studies-in-thread.mp4',poster:'./media/poster.webp',chapters:'./media/chapters.vtt',captions:'./media/captions.vtt' });
}
