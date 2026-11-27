import config from '../peer.config.json' with {type:'json'};
const state=document.querySelector('#origin-state');
state.textContent=`Local preview: ${config.preview_origin}. Proposed production: ${config.production_origin} (not deployed or verified).`;
