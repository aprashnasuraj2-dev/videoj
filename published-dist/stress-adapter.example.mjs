export default {
  name: 'Native video',
  mount(host, input) {
    const root = document.createElement('div');
    const media = document.createElement(input.mediaKind === 'audio' ? 'audio' : 'video');
    media.controls = true;
    media.preload = 'metadata';
    media.src = input.source;

    if (input.poster && media instanceof HTMLVideoElement) {
      media.poster = input.poster;
    }

    if (input.chapters) {
      const track = document.createElement('track');
      track.kind = 'chapters';
      track.src = input.chapters;
      track.default = true;
      media.append(track);
    }

    for (const caption of input.captions || []) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.src = caption.src;
      track.label = caption.label;
      track.srclang = caption.language;
      track.default = Boolean(caption.default);
      media.append(track);
    }

    root.append(media);
    host.append(root);

    return {
      root,
      media,
      destroy() {
        media.pause();
        root.remove();
      },
    };
  },
};
