const FIXTURE_PREFIX='/__stress-fixtures/';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const noStore=headers=>{const h=new Headers(headers);h.set('Cache-Control','no-store, max-age=0');h.set('X-DHAGO-Stress-Fixture','1');return h};

async function proxyMedia(request,mode){
  const origin=new URL(request.url).origin;
  const upstream=new Request(origin+'/media/studies-in-thread.mp4',{
    method:'GET',
    headers:request.headers.has('range')?{Range:request.headers.get('range')}:undefined,
    cache:'no-store',
    credentials:'same-origin'
  });
  if(mode==='delay-first-byte')await sleep(700);
  const response=await fetch(upstream);
  const headers=noStore(response.headers);
  if(mode==='wrong-mime')headers.set('Content-Type','text/plain; charset=utf-8');
  if(!response.body)return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  if(mode==='slow-chunk'||mode==='midstream-pause'||mode==='truncated'){
    const reader=response.body.getReader();
    let delivered=0,paused=false;
    const body=new ReadableStream({
      async pull(controller){
        const {done,value}=await reader.read();
        if(done){controller.close();return}
        if(mode==='slow-chunk')await sleep(70);
        if(mode==='midstream-pause'&&!paused&&delivered>192*1024){paused=true;await sleep(1200)}
        if(mode==='truncated'&&delivered>128*1024){await reader.cancel();controller.close();return}
        delivered+=value.byteLength;
        controller.enqueue(value);
      },
      cancel(reason){return reader.cancel(reason)}
    });
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(FIXTURE_PREFIX))return;
  event.respondWith((async()=>{
    const name=url.pathname.slice(FIXTURE_PREFIX.length);
    if(name==='missing.mp4'||name==='missing-poster.webp')return new Response('Intentional Stress Lab 404',{status:404,headers:noStore({'Content-Type':'text/plain; charset=utf-8'})});
    if(name==='delayed.vtt'){await sleep(700);return new Response('WEBVTT\n\n00:00.000 --> 00:16.000\nLate network chapter\n',{status:200,headers:noStore({'Content-Type':'text/vtt; charset=utf-8'})})}
    if(name==='malformed.vtt')return new Response('WEBVTT\n\n00:09.000 --> 00:02.000\nReversed time\n\nthis is not a cue\n',{status:200,headers:noStore({'Content-Type':'text/vtt; charset=utf-8'})});
    if(name==='media.mp4')return proxyMedia(event.request,url.searchParams.get('mode')||'normal');
    return new Response('Unknown Stress Lab fixture',{status:404,headers:noStore({'Content-Type':'text/plain; charset=utf-8'})});
  })());
});
