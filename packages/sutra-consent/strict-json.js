// Restricted wire JSON: no duplicate member names, including escaped aliases.
// A bounded scanner rejects ambiguity and excessive nesting before returning the
// platform parser's ordinary JSON data. No eval, coercion or object callbacks.
export function parseUniqueJson(text,{maxChars=65536,maxDepth=32}={}){
 const invalid=()=>{throw new SyntaxError('Invalid, ambiguous or excessive JSON.');};
 if(typeof text!=='string'||!Number.isSafeInteger(maxChars)||maxChars<1||maxChars>262144||
  !Number.isSafeInteger(maxDepth)||maxDepth<1||maxDepth>64||text.length>maxChars)invalid();
 let i=0;
 const white=()=>{while(i<text.length&&(' \t\r\n'.includes(text[i])))i++;};
 const token=()=>{
  if(text[i]!=='"')invalid();
  const start=i++;
  while(i<text.length){
   const ch=text[i++];
   if(ch==='"')return JSON.parse(text.slice(start,i));
   if(ch==='\\')i++;
  }
  invalid();
 };
 const primitive=/(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
 function value(depth){
  if(depth>maxDepth)invalid();
  white();const ch=text[i];
  if(ch==='{'){
   i++;white();const seen=new Set();
   if(text[i]==='}'){i++;return;}
   for(;;){
    white();const key=token();if(seen.has(key))invalid();seen.add(key);
    white();if(text[i++]!==':')invalid();
    value(depth+1);white();
    const end=text[i++];if(end==='}')return;if(end!==',')invalid();
   }
  }
  if(ch==='['){
   i++;white();if(text[i]===']'){i++;return;}
   for(;;){value(depth+1);white();const end=text[i++];if(end===']')return;if(end!==',')invalid();}
  }
  if(ch==='"'){token();return;}
  primitive.lastIndex=i;const result=primitive.exec(text);
  if(!result)invalid();i=primitive.lastIndex;
 }
 value(0);white();if(i!==text.length)invalid();
 return JSON.parse(text);
}
