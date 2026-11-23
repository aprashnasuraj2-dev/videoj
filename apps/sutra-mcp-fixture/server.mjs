import http from 'node:http';
const port=Number(process.env.PORT||4196),callerOrigin=process.env.CALLER_ORIGIN||'http://127.0.0.1:4183';
const schema={type:'object',properties:{request:{type:'string',minLength:1,maxLength:1200}},required:['request'],additionalProperties:false};
const tool={name:'lookup',description:'Return a synthetic read-only lookup result for SUTRA interoperability tests.',inputSchema:schema};
function cors(req,res){
 const origin=req.headers.origin;
 if(origin&&origin!==callerOrigin)return false;
 if(origin){res.setHeader('Access-Control-Allow-Origin',callerOrigin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Accept, MCP-Protocol-Version');
 res.setHeader('Access-Control-Max-Age','60');
 return true;
}
const json=(res,status,payload)=>{const body=JSON.stringify(payload);res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.end(body);};
const server=http.createServer(async(req,res)=>{
 if(req.url==='/'){if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed');}res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('SUTRA controlled read-only MCP fixture. No production availability is claimed.');}
 if(req.url!=='/mcp'){res.statusCode=404;return res.end('Not found');}
 if(!cors(req,res)){res.statusCode=403;return res.end('Origin refused');}
 if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
 if(req.method!=='POST'){res.statusCode=405;res.setHeader('Allow','POST, OPTIONS');return res.end('Method not allowed');}
 let total=0,chunks=[];for await(const chunk of req){total+=chunk.length;if(total>16384){res.statusCode=413;return res.end('Too large');}chunks.push(chunk);}
 let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(res,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
 if(body?.jsonrpc!=='2.0'||typeof body.method!=='string')return json(res,400,{jsonrpc:'2.0',id:body?.id??null,error:{code:-32600,message:'Invalid request'}});
 if(body.method==='notifications/initialized'){res.statusCode=202;return res.end();}
 const reply=result=>json(res,200,{jsonrpc:'2.0',id:body.id,result});
 if(body.method==='initialize')return reply({protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'sutra-readonly-fixture',version:'0.1.0'}});
 if(body.method==='tools/list')return reply({tools:[tool,{name:'not_declared',description:'A second read tool that caller descriptors must filter out.',inputSchema:schema}]});
 if(body.method==='tools/call'){
  if(body.params?.name!=='lookup')return json(res,200,{jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'Tool not allowed'}});
  const args=body.params.arguments;if(!args||typeof args.request!=='string'||!args.request.trim()||args.request.length>1200||Object.keys(args).some(key=>key!=='request'))return json(res,200,{jsonrpc:'2.0',id:body.id,error:{code:-32602,message:'Invalid arguments'}});
  return reply({isError:false,structuredContent:{version:1,truthStatus:'unverified',answer:'Synthetic controlled MCP read.',requestEcho:args.request}});
 }
 return json(res,200,{jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'Method not found'}});
});
server.listen(port,'127.0.0.1',()=>console.log(`SUTRA MCP fixture http://127.0.0.1:${port}/mcp for caller ${callerOrigin}`));
