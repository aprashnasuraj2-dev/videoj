import config from '../peer.config.json' with {type:'json'};
const state=document.querySelector('#origin-state');
state.textContent=`Local preview: ${config.preview_origin}. Production peer: ${config.production_origin ?? 'unassigned'} — ${config.production_origin_requirement}`;
