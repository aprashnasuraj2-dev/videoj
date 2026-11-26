import {validateReviewerFeedback} from './reviewer.mjs';
export function createFeedbackEndpoint({append}={}){
 if(typeof append!=='function')throw Error('Feedback append sink required.');
 return async function handle(request){
  if(!(request instanceof Request))return Response.json({error:'INVALID_REQUEST'},{status:400,headers:{'Cache-Control':'no-store'}});
  const url=new URL(request.url);
  if(url.pathname!=='/reviewer-feedback'||url.search||url.hash||request.method!=='POST')return Response.json({error:'NOT_FOUND'},{status:404,headers:{'Cache-Control':'no-store'}});
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||request.headers.has('authorization')||request.headers.has('cookie'))return Response.json({error:'BOUNDARY'},{status:403,headers:{'Cache-Control':'no-store'}});
  let text;try{text=await request.text();if(new TextEncoder().encode(text).byteLength>16384)throw Error();}catch{return Response.json({error:'BODY'},{status:400,headers:{'Cache-Control':'no-store'}});}
  let record;try{record=validateReviewerFeedback(JSON.parse(text));}catch{return Response.json({error:'INVALID_FEEDBACK'},{status:400,headers:{'Cache-Control':'no-store'}});}
  try{await append(record);}catch{return Response.json({error:'STORE_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
  return Response.json({accepted:true,recordHash:record.recordHash},{status:201,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 };
}
