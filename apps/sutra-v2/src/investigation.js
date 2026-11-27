import {evaluateFrontier} from '../../../packages/sutra-knowledge/frontier.js';
import {frontierCase} from '../../../packages/sutra-knowledge/examples/frontier.mjs';
const by=id=>document.getElementById(id);
function text(id,value){by(id).textContent=value;}
function worldCards(target,worlds){
 by(target).replaceChildren(...worlds.map(w=>{
  const card=document.createElement('article');card.className='node';const title=document.createElement('strong'),value=document.createElement('span');
  title.textContent=w.id;value.textContent=w.decision;card.append(title,value);return card;
 }));
}
function renderPolicy(node,depth=0){
 const pad='  '.repeat(depth);
 if(node.kind==='decision')return pad+node.decision+' (stop)';
 return pad+node.observationId+' · cost '+node.cost+'\n'+node.branches.map(b=>pad+'→ '+b.outcome+'\n'+renderPolicy(b.next,depth+1)).join('\n');
}
let frontierBusy=false;
async function frontier(insufficient){
 if(frontierBusy)return;frontierBusy=true;
 try{
  const c=JSON.parse(frontierCase());if(insufficient)c.observations=c.observations.filter(x=>x.id==='measure_stiffness');
  const r=await evaluateFrontier(JSON.stringify(c));worldCards('frontier-worlds',r.worlds);
  by('frontier-status').dataset.state=r.status;
  text('frontier-status',r.plan?'Best-case '+r.plan.bestCost+' · worst-case '+r.plan.worstCost+' synthetic effort units.':'Available observations cannot distinguish '+r.witness.join(' from ')+'. Abstain.');
  text('frontier-plan',r.plan?renderPolicy(r.plan):'No decisive policy under the declared observations.');
 }catch{delete by('frontier-status').dataset.state;text('frontier-status','Computation refused.');text('frontier-plan','');}
 finally{frontierBusy=false;}
}
by('frontier-run').addEventListener('click',()=>frontier(false));by('frontier-insufficient').addEventListener('click',()=>frontier(true));
