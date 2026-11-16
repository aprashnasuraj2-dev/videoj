/** Optional Mux URL helpers. This file is never imported by the core skin. */
function assertPublicPlaybackId(playbackId) {
  if (typeof playbackId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(playbackId)) {
    throw new TypeError('Provide a public Mux playback ID, not a management token.');
  }
}

export function muxPlaybackUrl(playbackId, { domain = 'stream.mux.com' } = {}) {
  assertPublicPlaybackId(playbackId);
  if (domain !== 'stream.mux.com') {
    throw new TypeError('Custom playback domains require a host-owned integration.');
  }
  return `https://${domain}/${playbackId}.m3u8`;
}

export function muxStaticMp4Url(playbackId, { rendition = 'highest.mp4', domain = 'stream.mux.com' } = {}) {
  assertPublicPlaybackId(playbackId);
  if (domain !== 'stream.mux.com') {
    throw new TypeError('Custom playback domains require a host-owned integration.');
  }
  if (!/^[a-zA-Z0-9._-]+\.mp4$/.test(rendition)) {
    throw new TypeError('Provide a public Mux static rendition filename.');
  }
  return `https://${domain}/${playbackId}/${rendition}`;
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
