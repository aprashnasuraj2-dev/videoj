import './temporal-lens.js';
import { bindAfterimageExample } from './authored-example.js';
import { createAfterimageShell } from './shell.js';

function normalizeExample(options) {
  const example = options?.example;
  if (!example) return null;
  const pinnedSeconds = Number(example.pinnedSeconds);
  const currentSeconds = Number(example.currentSeconds);
  if (!Number.isFinite(pinnedSeconds) || !Number.isFinite(currentSeconds) || pinnedSeconds < 0 || currentSeconds < 0) return null;
  return { pinnedSeconds, currentSeconds };
}

function temporalLensMarkup(example) {
  const exampleButton = example
    ? '<button type="button" class="afterimage-action afterimage-example-action" data-afterimage-example>Try a comparison</button>'
    : '';
  return '<afterimage-temporal-lens class="afterimage-lens">' +
    '<div class="afterimage-lens-primary">' +
      exampleButton +
      '<button type="button" class="afterimage-action afterimage-pin-action" data-afterimage-pin><span>Pin moment</span></button>' +
      '<button type="button" class="afterimage-action" data-afterimage-compare hidden>Compare</button>' +
      '<button type="button" class="afterimage-action" data-afterimage-close hidden>Close comparison</button>' +
    '</div>' +
    '<div class="afterimage-presets" role="group" aria-label="Comparison views">' +
      '<button type="button" data-afterimage-preset="100" hidden>Pinned</button>' +
      '<button type="button" data-afterimage-preset="50" hidden>Split</button>' +
      '<button type="button" data-afterimage-preset="0" hidden>Now</button>' +
    '</div>' +
    '<button type="button" class="afterimage-clear" data-afterimage-clear hidden>Clear pin</button>' +
  '</afterimage-temporal-lens>';
}

export function createAfterimagePlayer(media, options = {}) {
  const example = normalizeExample(options);
  const player = createAfterimageShell(media, temporalLensMarkup(example));
  if (example) bindAfterimageExample(player, media, example);
  return player;
}
