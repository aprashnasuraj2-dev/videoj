// Trusted Node transport for the research package. Never exposed as a relay.
import {lookup} from 'node:dns/promises';
import {connect,checkServerIdentity} from 'node:tls';
import {request} from 'node:https';
import {BlockList,isIP} from 'node:net';
import {resolvePublicPeer} from './dynamic-public-route-policy.js';
const fail=code=>Object.assign(Error('Research transport refused: '+code),{code});
function sameAddress(a,b,f){if(isIP(a)!==f)return false;const list=new BlockList(),kind=f===4?'ipv4':'ipv6';list.addAddress(b,kind);return list.check(a,kind);}
export async function pinnedPublicHttp({url,method='GET',headers={},body,maxBytes,signal,acceptedTypes,allowMissing=false,allowRedirectResponse=false,documentOnly=false},{resolveAll=host=>lookup(host,{all:true,verbatim:true}),dialTls=connect,requestHttps=request}={}){
 if(!(url instanceof URL)||url.protocol!=='https:'||url.username||url.password||url.port||!['GET','POST'].includes(method)||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>1048576||!Array.isArray(acceptedTypes)||!acceptedTypes.length)throw fail('CONFIG');
 if(documentOnly&&(method!=='GET'||body!==undefined||Reflect.ownKeys(headers).length!==0))throw fail('DOCUMENT_HEADERS');
 if(allowRedirectResponse&&(method!=='GET'||Object.keys(headers).some(k=>/^(?:authorization|cookie|proxy-authorization|x-api-key|x-subscription-token)$/i.test(k))))throw fail('REDIRECT_CONFIG');
 const active=signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
 return new Promise((resolve,reject)=>{
  let done=false,socket,req,res;
  const finish=(error,result)=>{if(done)return;done=true;active.removeEventListener('abort',cancel);res?.destroy();req?.destroy();socket?.destroy();error?reject(error):resolve(result);};
  const cancel=()=>finish(fail('CANCELLED_OR_TIMEOUT'));
  active.addEventListener('abort',cancel,{once:true});if(active.aborted){cancel();return;}
  (async()=>{
   const peer=await resolvePublicPeer(url.hostname,resolveAll,active);if(done||active.aborted)return;
   socket=dialTls({host:peer.address,family:peer.family,port:443,servername:url.hostname,minVersion:'TLSv1.2',rejectUnauthorized:true,ALPNProtocols:['http/1.1'],lookup:(_h,_o,cb)=>cb(fail('DNS_DISABLED'))});
   socket.on('error',()=>finish(fail('TLS')));socket.on('close',()=>{if(!done&&!res?.complete)finish(fail('TRUNCATED'));});
   socket.once('secureConnect',()=>{
    try{
     if(done||active.aborted)return;
     if(!socket.encrypted||!socket.authorized||socket.remotePort!==443||!sameAddress(socket.remoteAddress,peer.address,peer.family)||!['TLSv1.2','TLSv1.3'].includes(socket.getProtocol())||socket.alpnProtocol!==false&&socket.alpnProtocol!=='http/1.1'||checkServerIdentity(url.hostname,socket.getPeerCertificate())){finish(fail('TLS_IDENTITY'));return;}
     let handed=false;
     req=requestHttps({hostname:url.hostname,port:443,path:url.pathname+url.search,method,headers:{...headers,Host:url.hostname,'User-Agent':'SutraResearch/0.1','Accept-Encoding':'identity',Connection:'close'},agent:null,maxHeaderSize:8192,createConnection:()=>{if(handed||done)throw fail('SOCKET');handed=true;return socket;}},incoming=>{
      res=incoming;if(done){res.destroy();return;}
      if(allowRedirectResponse&&[301,302,303,307,308].includes(res.statusCode)){
       const location=res.headers.location;if(typeof location!=='string'||!location||location.length>2048||/[\u0000-\u0020\u007f]/.test(location)){finish(fail('REDIRECT_LOCATION'));return;}
       finish(null,{status:res.statusCode,location,bytes:0,body:Buffer.alloc(0),mediaType:''});return;
      }
      if(allowMissing&&[404,410].includes(res.statusCode)){finish(null,{status:res.statusCode,bytes:0,body:Buffer.alloc(0),mediaType:''});return;}
      const raw=res.headers['content-type'],encoding=res.headers['content-encoding'],length=res.headers['content-length'];
      const mediaType=typeof raw==='string'?raw.split(';')[0].trim().toLowerCase():'';
      if(res.statusCode!==200||!acceptedTypes.includes(mediaType)||encoding!==undefined&&encoding!=='identity'||res.headers['content-range']!==undefined||length!==undefined&&(typeof length!=='string'||!/^\d+$/.test(length)||Number(length)>maxBytes)){finish(fail('RESPONSE'));return;}
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{if(done)return;bytes+=chunk.length;if(bytes>maxBytes){finish(fail('RESPONSE_SIZE'));return;}chunks.push(chunk);});
      res.on('error',()=>finish(fail('RESPONSE')));res.on('aborted',()=>finish(fail('TRUNCATED')));
      res.on('end',()=>{if(done)return;if(!res.complete||length!==undefined&&Number(length)!==bytes){finish(fail('TRUNCATED'));return;}finish(null,{status:200,mediaType,bytes,body:Buffer.concat(chunks,bytes)});});
     });
     req.on('error',()=>finish(fail('TRANSPORT')));req.on('socket',s=>{if(s!==socket)finish(fail('SOCKET'));});req.on('upgrade',(_r,s)=>{s.destroy();finish(fail('UPGRADE'));});
     if(!done)req.end(body);
    }catch{finish(fail('TRANSPORT'));}
   });
  })().catch(e=>finish(fail(e?.code==='DNS_ADDRESS'?'DNS_ADDRESS':'TRANSPORT')));
 });
}
