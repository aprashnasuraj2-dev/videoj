/** Host supplies its own native media element and track children. */
export interface DetourOptions {
  /** Only explicit, seekable video-on-demand enables the held-place action. */
  sourceKind?: 'vod' | 'live' | 'unknown';
  /** Number of source-scoped places a viewer may keep. Defaults to 1; maximum 4. */
  maxPlaces?: 1 | 2 | 3 | 4;
  /**
   * 'button' preserves the original explicit Return/Stay controls.
   * 'marker' renders saved places as interactive timeline checkpoints.
   * Multiple places require 'marker'.
   */
  returnUi?: 'button' | 'marker';
}
export declare function createDetourPlayer(media: HTMLVideoElement | HTMLAudioElement, options?: DetourOptions): HTMLElement;
