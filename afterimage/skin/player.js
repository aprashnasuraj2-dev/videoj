import './temporal-lens.js';
import { createAfterimageShell } from './shell.js';

const temporalLensMarkup =
  '<afterimage-temporal-lens class="afterimage-lens">' +
    '<div class="afterimage-lens-primary">' +
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

export function createAfterimagePlayer(media) {
  return createAfterimageShell(media, temporalLensMarkup);
}
