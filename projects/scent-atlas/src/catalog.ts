/** The only content model for Scent Atlas. No commerce, PII or external APIs. */
export type Sample = {
  id: string; name: string; shorthand: string; description: string;
  first: string; texture: string; character: string; linger: string;
};
export type Scene = {
  id: 'rain' | 'cedar' | 'orange'; name: string; kicker: string; headline: string;
  deck: string; cues: readonly [string,string]; image: string; imageAlt: string;
  opening: string; middle: string; finish: string; lead: string;
  palette: string; number: string;
};
export type Kit = { id: string; scene: Scene['id']; name: string; introduction: string; samples: readonly [string,string,string]; roles: readonly [string,string,string]; };
export const samples: readonly Sample[] = [
  {id:'rain-stone',name:'Rain on Stone',shorthand:'Wet stone · crushed leaves · soft wood',description:'The hush after a shower. Cool pavement and bruised green leaves settle into a gentle, dry warmth.',first:'Wet concrete',texture:'Cool / dry',character:'Quiet',linger:'Soft wood'},
  {id:'green-air',name:'Green Air',shorthand:'Snapped stems · lemon pith · clean air',description:'The bright, green moment when the clouds clear and everything feels rinsed clean.',first:'Snapped stems',texture:'Green / airy',character:'Fresh',linger:'After-rain air'},
  {id:'pencil-cedar',name:'Pencil Cedar',shorthand:'Pencil shavings · clean dry wood',description:'A pencil freshly sharpened. Familiar, intimate wood without any heaviness.',first:'Pencil shavings',texture:'Dry / smooth',character:'Soft',linger:'Clean timber'},
  {id:'cedar-shavings',name:'Cedar Shavings',shorthand:'Sawdust · cedar boards · black tea',description:'The first cut through a cedar board, with a warm edge that recalls black tea.',first:'Fresh sawdust',texture:'Dry / warm',character:'Grounded',linger:'Cedar boards'},
  {id:'peel-wood',name:'Peel & Wood',shorthand:'Bitter orange rind · dry cedar',description:'The tiny spark of an orange rind over the stillness of freshly worked wood.',first:'Bitter rind',texture:'Bright / dry',character:'Balanced',linger:'Dry cedar'},
  {id:'fresh-peel',name:'Fresh Peel',shorthand:'Torn orange peel · white pith · green edge',description:'That split second when a thumb breaks orange skin and fragrant oils lift into the air.',first:'Orange oil',texture:'Juicy / crisp',character:'Vivid',linger:'Soft green peel'}
];
export const scenes: readonly Scene[] = [
 {id:'rain',name:'Rain on Pavement',kicker:'01 / AFTER THE RAIN',headline:'The city, just after the storm.',deck:'A few minutes of rain. A pavement darkened to slate. Leaves pressed into the stillness.',cues:['Cool stone','Crushed leaves'],image:'/media/rain.webp',imageAlt:'Rain circles expanding across dark pavement, with a single wet leaf in the foreground.',opening:'Cool stone and the first drops on pavement',middle:'Green leaves, snapped stems, a quieter air',finish:'A soft, dry edge of wood',lead:'rain-stone',palette:'rain',number:'01'},
 {id:'cedar',name:'Cedar Workshop',kicker:'02 / THE WOOD SHOP',headline:'A place made of quiet things.',deck:'Curls of cedar on a well-worn bench. Late light. The familiar sound of a pencil being sharpened.',cues:['Dry wood','Pencil shavings'],image:'/media/cedar.webp',imageAlt:'Warm sunlight falling on fine curls of freshly shaved cedar wood atop a worn timber workbench.',opening:'The clean, warm scent of fresh cedar shavings',middle:'Dry pencil wood and a hint of black tea',finish:'A little bitter orange against the grain',lead:'cedar-shavings',palette:'cedar',number:'02'},
 {id:'orange',name:'Fresh Orange Peel',kicker:'03 / THE CITRUS TABLE',headline:'A little burst of daylight.',deck:'One torn peel, a fine mist of citrus oil, and that satisfying bright edge between sweet and bitter.',cues:['Citrus oil','Bitter pith'],image:'/media/orange.webp',imageAlt:'Macro view of a fresh, torn orange peel showing glistening rind and soft white pith.',opening:'The vivid oil released from a torn orange rind',middle:'A bright green note and the bitter white pith',finish:'A calmer, dry wood note underneath',lead:'fresh-peel',palette:'orange',number:'03'}
];
export const kits: readonly Kit[] = [
 {id:'after-rain',scene:'rain',name:'After Rain',introduction:'The mineral hush, the green lift, the gentle dry-down. Three ways to step out after the shower.',samples:['rain-stone','green-air','pencil-cedar'],roles:['The first rain','The green air','The dry edge']},
 {id:'wood-bench',scene:'cedar',name:'Wood Bench',introduction:'An invitation into the workshop: warm timber, quiet pencil wood and a bright counterpoint.',samples:['cedar-shavings','pencil-cedar','peel-wood'],roles:['The warm wood','The quieter wood','The contrast']},
 {id:'freshly-peeled',scene:'orange',name:'Freshly Peeled',introduction:'Orange in three dimensions, from that first burst of oil to the bitter peel and the green afterglow.',samples:['fresh-peel','peel-wood','green-air'],roles:['The bright opening','The bittersweet turn','The green finish']}
];
/** Fail closed: structural errors must never silently reach a public build. */
export function validateCatalog(theSamples: readonly Sample[]=samples, theScenes: readonly Scene[]=scenes, theKits:readonly Kit[]=kits): void {
 const unique=(ids: readonly string[],type:string)=>{if(new Set(ids).size!==ids.length)throw Error('Duplicate '+type+' ID');};
 unique(theSamples.map(x=>x.id),'sample'); unique(theScenes.map(x=>x.id),'scene'); unique(theKits.map(x=>x.id),'kit');
 if(theSamples.length!==6||theScenes.length!==3||theKits.length!==3)throw Error('Expected six samples, three scenes and three kits');
 const sampleIds=new Set(theSamples.map(x=>x.id));const sceneIds=new Set(theScenes.map(x=>x.id));
 for(const scene of theScenes){if(!sampleIds.has(scene.lead))throw Error('Unknown lead '+scene.id);if(!scene.image.startsWith('/media/'))throw Error('Invalid image '+scene.id);}
 for(const kit of theKits){
  if(!sceneIds.has(kit.scene))throw Error('Invalid scene '+kit.id);
  if(kit.samples.length!==3||new Set(kit.samples).size!==3)throw Error('Kit must have three distinct vials: '+kit.id);
  if(kit.roles.length!==3||kit.roles.some(x=>!x.trim()))throw Error('Kit must define three roles: '+kit.id);
  if(kit.samples.some(x=>!sampleIds.has(x)))throw Error('Unknown sample in '+kit.id);
  if(kit.samples[0]!==theScenes.find(x=>x.id===kit.scene)?.lead)throw Error('Lead sample mismatch: '+kit.id);
 }
 if(new Set(theKits.map(x=>x.scene)).size!==3)throw Error('Each scene must have exactly one kit');
}
validateCatalog();
