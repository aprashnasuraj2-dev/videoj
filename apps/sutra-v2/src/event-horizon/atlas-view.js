import {readPublishedIndex,inspectPublishedNetwork,inspectImportedNetwork} from './passports.js';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=E('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function field(name,control){const l=E('label',name,'eh-field');l.append(control);return l;}
const code=e=>typeof e?.code==='string'&&/^[A-Z_]{1,80}$/.test(e.code)?e.code:typeof e?.message==='string'&&/^[A-Z_]{1,80}$/.test(e.message)?e.message:'INSPECTION_REFUSED';
function metadata(pairs){const dl=E('dl',undefined,'eh-details');for(const [k,v] of pairs){dl.append(E('dt',k),E('dd',String(v??'Unknown')));}return dl;}
export function mountAtlasView(root){
 const section=E('section',undefined,'eh-atlas');section.id='eh-atlas';
 section.append(E('p','OPEN WEB / PORTABLE DEFINITIONS','eh-kicker'),E('h2','Agent Atlas'),E('p','Inspect published network definitions and portable local JSON without executing them. Discovery is explicit and restricted to the current site’s static agent artifacts.','eh-copy'));
 const controls=E('div',undefined,'eh-actions'),indexArea=E('div',undefined,'eh-atlas-index'),passport=E('div',undefined,'eh-atlas-passport'),status=E('p','No publisher has been contacted.','eh-state');
 status.id='eh-atlas-status';status.setAttribute('role','status');
 let active=null,epoch=0,index=null;
 const cancel=button('Cancel inspection',()=>{active?.abort();});cancel.disabled=true;
 const profile=E('select');
 for(const [id,text] of [['local','Local graph only'],['reviewed','Reviewed-evidence inspection'],['linked-peer','Symbolic peer-link inspection']]){const o=E('option',text);o.value=id;profile.append(o);}
 function renderPassport(p){
  passport.replaceChildren(E('p','NETWORK PASSPORT / INSPECTED DEFINITION','eh-kicker'),E('h3',p.name),E('p',p.description,'eh-copy'),
   metadata([['Publisher origin',p.origin??'Unverified local file'],['Declared front',p.front],['Inspection profile',p.profile],['Agent definitions',p.definitionCount],['Actual running instances','None instantiated by inspection'],['Permissions','None granted'],['Peer availability','Not observed']]));
  const hashes=E('details',undefined,'eh-timeline');hashes.append(E('summary','Exact artifact identities'));for(const [name,digest] of Object.entries(p.digests))hashes.append(E('p',name+': '+digest,'eh-copy'));passport.append(hashes);
  const definitions=E('div',undefined,'eh-atlas-definitions');
  for(const n of p.nodes){
   const item=E('article',undefined,'eh-definition');item.append(E('p','DECLARED AGENT DEFINITION','eh-kicker'),E('h4',n.label),E('p',n.description,'eh-copy'),E('small',n.toolCount+' declared tool reference(s)'));
   const links=p.edges.filter(e=>e.from===n.id);for(const e of links)item.append(E('p','May delegate to '+e.to,'eh-copy'));
   for(const ref of p.references.filter(e=>e.from===n.id))item.append(E('p',ref.kind+': '+ref.reference,'eh-copy'));
   definitions.append(item);
  }
  passport.append(definitions,E('p',p.qualification,'eh-copy'));
 }
 async function action(fn,done){
  if(active)return;const ticket=++epoch,controller=new AbortController();active=controller;cancel.disabled=false;read.disabled=true;importButton.disabled=true;profile.disabled=true;
  const timeout=setTimeout(()=>controller.abort(),6000);
  status.textContent='Inspecting bounded artifact data…';passport.replaceChildren();
  try{const result=await fn(controller.signal);if(ticket!==epoch||controller.signal.aborted){status.textContent='Inspection stopped; no usable artifact claimed.';return;}done(result);}
  catch(e){if(ticket===epoch)status.textContent=controller.signal.aborted?'Inspection stopped; no usable artifact claimed.':'Inspection refused: '+code(e)+'.';}
  finally{clearTimeout(timeout);if(ticket===epoch){active=null;cancel.disabled=true;read.disabled=false;importButton.disabled=false;profile.disabled=false;}}
 }
 const read=button('Read current publisher index',()=>action(signal=>readPublishedIndex(location.origin,{signal}),result=>{
  index=result;indexArea.replaceChildren(E('h3','Observed publisher index'),E('p',result.origin,'eh-copy'),E('small',result.digest,'eh-copy'));
  for(const n of result.networks){
   const item=E('article',undefined,'eh-index-card');item.append(E('h4',n.name),E('p',n.description,'eh-copy'),E('small','Declared front '+n.front+' · not executing'),button('Inspect '+n.name,()=>{if(index===result)action(signal=>inspectPublishedNetwork(location.origin,n.name,{profile:profile.value,signal}),p=>{renderPassport(p);status.textContent='Network definition inspected. No model or peer call.';});}));indexArea.append(item);
  }
  if(result.declaredPeers.length)indexArea.append(E('p','Publisher-declared peer origins: '+result.declaredPeers.join(' · ')+' · not contacted','eh-copy'));
  status.textContent=result.networks.length+' declared networks found; no graph has executed.';
 }));
 read.id='eh-atlas-read';
 const importPanel=E('details',undefined,'eh-timeline');importPanel.append(E('summary','Inspect a portable local JSON graph'));
 const file=E('input');file.type='file';file.accept='.json,application/json';file.id='eh-atlas-file';
 const front=E('input');front.maxLength=60;front.placeholder='Exact front agent identifier';
 const importButton=button('Inspect local graph',()=>action(async signal=>{
  const selected=file.files?.[0];if(!selected||!selected.size||selected.size>65536)throw Error('PASSPORT_IMPORT');
  const bytes=new Uint8Array(await selected.arrayBuffer());if(signal.aborted)throw Error('CANCELLED');return inspectImportedNetwork(bytes,{front:front.value.trim()});
 },p=>{renderPassport(p);status.textContent='Local graph inspected. No publication or execution.';}));
 importPanel.append(E('p','Maximum 64 KiB, strict local graph profile. Imported code and external tool references are not executed or admitted.','eh-copy'),field('Network JSON file',file),field('Declared front',front),importButton);
 controls.append(read,cancel,field('Graph inspection profile',profile));section.append(controls,status,indexArea,importPanel,passport);root.append(section);return section;
}
