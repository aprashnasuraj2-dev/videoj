export default {
  name: 'Native media example',
  mount(host, input) {
    const root = document.createElement('section');
    root.style.cssText = 'width:100%;padding:12px;background:#f3eee4;color:#171918';
    const media = document.createElement(input.mediaKind === 'audio' ? 'audio' : 'video');
    media.controls = true;
    media.preload = 'metadata';
    media.style.width = '100%';
    media.src = input.source;
    if (input.poster && media instanceof HTMLVideoElement) media.poster = input.poster;

    if (input.chapters) {
      const track = document.createElement('track');
      track.kind = 'chapters';
      track.src = input.chapters;
      track.label = 'Stress chapters';
      track.default = true;
      media.append(track);
    }

    for (const item of input.captions || []) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.src = item.src;
      track.label = item.label;
      track.srclang = item.language;
      track.default = Boolean(item.default);
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