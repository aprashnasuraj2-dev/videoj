export declare function muxPlaybackUrl(playbackId: string, options?: { domain?: 'stream.mux.com' }): string;
export declare function muxStaticMp4Url(playbackId: string, options?: { rendition?: string; domain?: 'stream.mux.com' }): string;
export declare function configureNativeMuxVideo(video: HTMLVideoElement, playbackId: string): HTMLVideoElement;
