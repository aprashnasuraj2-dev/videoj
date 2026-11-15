/** Optional Mux URL helper. This file is never imported by the core skin. */
export function muxPlaybackUrl(playbackId, { domain = 'stream.mux.com' } = {}) {
  if (typeof playbackId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(playbackId)) {
    throw new TypeError('Provide a public Mux playback ID, not a management token.');
  }
  if (domain !== 'stream.mux.com') {
    throw new TypeError('Custom playback domains require a host-owned integration.');
  }
  return `https://${domain}/${playbackId}.m3u8`;
}

/** Browser-native HLS is not universal. Hosts must supply a compatible playback engine. */
export function configureNativeMuxVideo(video, playbackId) {
  if (!(video instanceof HTMLVideoElement)) throw new TypeError('A host-owned video element is required.');
  if (!video.canPlayType('application/vnd.apple.mpegurl')) {
    throw new Error('This browser needs a host-managed HLS playback engine.');
  }
  video.src = muxPlaybackUrl(playbackId);
  return video;
}
