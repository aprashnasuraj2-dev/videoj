// Bounded, non-executing HTML text scanner; no DOM, scripting, resource fetches or entity expansion.
// Deliberately rejects malformed or oversize tags rather than emulate a browser.
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {secretLike} from './research-session.js';
const blocks=new Set(['address','article','blockquote','br','caption','dd','div','dl','dt','h1','h2','h3','h4','h5','h6','hr','li','main','ol','p','pre','section','table','td','th','tr','ul']);
const rawBlocks=new Set(['script','style','iframe','object','template','noscript','svg','textarea','xmp','noembed','noframes','math']);
const entities={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
function decode(s){
 return s.replace(/&(?:#(?:[0-9]{1,7}|x[0-9a-f]{1,6})|nbsp|amp|lt|gt|quot|apos);/gi,m=>{
  const k=m.slice(1,-1).toLowerCase();if(k[0]!=='#')return entities[k]??m;
  const n=k[1]==='x'?Number.parseInt(k.slice(2),16):Number(k.slice(1));
  return Number.isInteger(n)&&n>=32&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):' ';
 });
}
function readTag(s,i){
 let quote=null;
 for(let j=i+1;j<s.length&&j-i<=4096;j++){
  const c=s[j];if(quote){if(c===quote)quote=null;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='>')return {inside:s.slice(i+1,j),end:j+1};
 }
 throw Error('HTML_TAG_LIMIT');
}
function attributes(raw){
 const out=Object.create(null),pattern=/([a-zA-Z][a-zA-Z0-9_:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/g;
 let n=0;for(const m of raw.matchAll(pattern)){if(++n>64)break;const k=m[1].toLowerCase();if(!Object.hasOwn(out,k))out[k]=decode(m[2]??m[3]??m[4]);}
 return out;
}
export function scanHtml(source,url,{allowCrossOriginLinks=false,allowQuery=false}={}){
 if(typeof source!=='string'||source.length>1048576)throw Error('HTML_SIZE');
 const lower=source.replace(/[A-Z]/g,c=>c.toLowerCase()),pieces=[],links=[],metadata=Object.create(null),base=new URL(url);let i=0,tags=0,title=false;
 while(i<source.length){
  const next=source.indexOf('<',i);
  if(next<0){const tail=decode(source.slice(i));pieces.push(tail);break;}
  if(next>i){const value=decode(source.slice(i,next));pieces.push(value);if(title&&!metadata.title)metadata.title=value.trim().slice(0,300);}
  if(source.startsWith('<!--',next)){const close=source.indexOf('-->',next+4);if(close<0)throw Error('HTML_COMMENT');i=close+3;continue;}
  if(!/[a-zA-Z!?/]/.test(source[next+1]??'')){pieces.push('<');i=next+1;continue;}
  const tag=readTag(source,next);i=tag.end;if(++tags>30000)throw Error('HTML_TAG_COUNT');
  const m=/^\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(tag.inside);if(!m)continue;
  const closing=Boolean(m[1]),name=m[2].toLowerCase();
  if(rawBlocks.has(name)&&!closing){
   // Skip raw/untrusted subtrees. Exact closing tag delimiter prevents </scriptx> confusion.
   let at=i,found=-1;while((at=lower.indexOf('</'+name,at))>=0){const after=lower[at+name.length+2];if(after==='>'||/\s/.test(after??'')){found=at;break;}at+=name.length+2;}
   if(found<0)throw Error('HTML_RAW_BLOCK');
   // Nested non-raw containers are ambiguous in this intentionally narrow scanner.
   // Refuse rather than let a nested close expose hidden text or links as evidence.
   if(['template','svg','math','object','noscript'].includes(name)){const nested=new RegExp('<'+name+'(?:[\\s/>])','i');if(nested.test(source.slice(i,found)))throw Error('HTML_NESTED_RAW_BLOCK');}
   i=readTag(source,found).end;pieces.push(' ');continue;
  }
  if(name==='title'){title=!closing;pieces.push('\n');}
  if(blocks.has(name))pieces.push('\n');
  if(closing)continue;
  if(name==='meta'){
   const a=attributes(tag.inside.slice(m[0].length)),key=(a.name??a.property??'').toLowerCase();
   if(['author','article:published_time','date','og:title'].includes(key)&&typeof a.content==='string'&&!metadata[key]&&!secretLike(a.content))metadata[key]=a.content.slice(0,300);
  }
  if(name==='a'&&links.length<40){
   const a=attributes(tag.inside.slice(m[0].length));if(!a.href||a.href.length>2048)continue;
   try{const next=admitDocumentURL(new URL(a.href,url).href,{allowQuery});if(!secretLike(next)&&!secretLike(decodeURIComponent(new URL(next).pathname))&&(allowCrossOriginLinks||new URL(next).origin===base.origin)&&!links.includes(next))links.push(next);}catch{}
  }
 }
 const text=pieces.join('').replace(/\r\n?/g,'\n').replace(/[^\S\n]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 return {text,links,metadata:Object.freeze({...metadata})};
}
