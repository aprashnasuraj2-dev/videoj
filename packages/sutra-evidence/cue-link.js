import {cueHref,validateAnnotationProfile} from './annotation.js';

/** Pure data helper for tiny integrations that do not want DOM ownership. */
export function cueLinkData(annotation,{label='Open evidence cue'}={}){
 const checked=validateAnnotationProfile(annotation);
 if(!checked.valid)throw new Error('Invalid SUTRA evidence annotation.');
 return {href:cueHref(annotation),label};
}

/**
 * Drop-in cue anchor. The host owns styling/player behavior; this module only
 * creates the standards-derived #t=start,end link.
 */
export function mountCueLink(root,annotation,options={}){
 if(!root?.ownerDocument?.createElement||typeof root.replaceChildren!=='function')throw new TypeError('A DOM element is required.');
 const data=cueLinkData(annotation,options),link=root.ownerDocument.createElement('a');
 link.href=data.href;link.textContent=data.label;link.rel='noopener';link.dataset.sutraEvidenceCue='true';
 root.replaceChildren(link);return link;
}
