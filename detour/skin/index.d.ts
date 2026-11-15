/** Host supplies its own native media element and track children. */
export interface DetourOptions {
  /** Only explicit, seekable video-on-demand enables the held-place action. */
  sourceKind?: 'vod' | 'live' | 'unknown';
}
export declare function createDetourPlayer(media: HTMLVideoElement | HTMLAudioElement, options?: DetourOptions): HTMLElement;
