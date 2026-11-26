// Internal trusted transport primitive. Production callers must obtain pin from
// public-route-policy; isolated tests exercise it with a loopback TLS fixture.
// This module is deliberately not a package export or a user-facing relay.
import {checkServerIdentity} from 'node:tls';
import {isIP,BlockList} from 'node:net';
const MAX_RESPONSE=262144;
const fail=code=>{const e=new Error('Hosted model exchange refused ('+code+').');e.code=code;throw e;};
function sameAddress(actual,expected,family){
 if(typeof actual!=='string'||actual.includes('%')||isIP(actual)!==family)return false;
 const list=new BlockList(),kind=family===4?'ipv4':'ipv6';
 list.addAddress(expected,kind);return list.check(actual,kind);
}

export function startPinnedHttps(pin,input,authMode,{dialTls,requestHttps}){
 let socket,req,res,done=false,started=false,settle;
 const promise=new Promise((resolve,reject)=>{settle={resolve,reject};});
 const finish=(ok,value)=>{
  if(done)return;done=true;
  if(!ok){res?.destroy();req?.destroy();socket?.destroy();settle.reject(Object.assign(new Error('Hosted model exchange refused ('+value+').'),{code:value}));}
  else{socket?.destroy();settle.resolve(value);}
 };
 try{
    socket=dialTls({host:pin.address,port:pin.port,family:pin.family,servername:pin.servername,rejectUnauthorized:true,minVersion:'TLSv1.2',ALPNProtocols:['http/1.1'],lookup:(_host,_options,cb)=>cb(new Error('DNS disabled'))});
    socket.on('error',()=>finish(false,'TLS'));
    socket.on('close',()=>{if(!done&&!res?.complete)finish(false,'TRUNCATED');});
    socket.once('secureConnect',()=>{
     if(done||started)return;started=true;
     try{
      if(socket.encrypted!==true||socket.authorized!==true||socket.remotePort!==pin.port||!sameAddress(socket.remoteAddress,pin.address,pin.family)||!['TLSv1.2','TLSv1.3'].includes(socket.getProtocol())||socket.alpnProtocol!==false&&socket.alpnProtocol!=='http/1.1'||checkServerIdentity(pin.hostname,socket.getPeerCertificate())){finish(false,'TLS_IDENTITY');return;}
      // No credential-bearing request is constructed until the exact peer and
      // hostname have been authenticated. No second dial, agent or redirect.
      const headers={'Host':pin.hostname,'Content-Type':'application/json; charset=utf-8','Accept':'application/json','Accept-Encoding':'identity','Content-Length':Buffer.byteLength(input.bodyText,'utf8'),'Connection':'close'};
      if(pin.protocol==='anthropic-messages-json')headers['anthropic-version']='2023-06-01';
      if(authMode==='bearer')headers.Authorization='Bearer '+input.credential;
      else if(authMode==='anthropic-key')headers['x-api-key']=input.credential;
      let handed=false;
      req=requestHttps({hostname:pin.hostname,port:pin.port,path:pin.path,method:'POST',headers,agent:null,maxHeaderSize:8192,createConnection:()=>{if(handed||done)fail('SOCKET');handed=true;return socket;}},incoming=>{
       res=incoming;if(done){res.destroy();return;}
       const type=res.headers['content-type'],encoding=res.headers['content-encoding'],length=res.headers['content-length'];
       if(res.statusCode!==200||typeof type!=='string'||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)||encoding!==undefined&&encoding!=='identity'||res.headers['content-range']!==undefined||length!==undefined&&(typeof length!=='string'||!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE)){finish(false,'RESPONSE');return;}
       let received=0;const chunks=[];
       res.on('data',chunk=>{if(done)return;received+=chunk.length;if(received>MAX_RESPONSE){finish(false,'RESPONSE_SIZE');return;}chunks.push(chunk);});
       res.on('aborted',()=>finish(false,'TRUNCATED'));res.on('error',()=>finish(false,'RESPONSE'));
       res.on('end',()=>{
        if(done)return;if(!res.complete||received===0||length!==undefined&&Number(length)!==received){finish(false,'TRUNCATED');return;}
        let bodyText;try{bodyText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,received));}catch{finish(false,'RESPONSE_ENCODING');return;}
        finish(true,Object.freeze({status:200,bodyText}));
       });
      });
      req.on('error',()=>finish(false,'TRANSPORT'));
      req.on('socket',s=>{if(s!==socket)finish(false,'SOCKET');});
      req.on('upgrade',(_response,s)=>{s.destroy();finish(false,'RESPONSE');});
      if(!done)req.end(input.bodyText);
     }catch{finish(false,'TRANSPORT');}
    });

 }catch{finish(false,'TRANSPORT');}
 return Object.freeze({promise,cancel:()=>finish(false,'CANCELLED')});
}
