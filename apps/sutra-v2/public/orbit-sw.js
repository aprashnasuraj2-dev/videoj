// Opt-in, static-only offline support. Never intercept external requests or cache investigation data.
const CACHE='sutra-orbit-static-v1';
const offline=new URL('offline.html',self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.add(offline))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sutra-orbit-static-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(async()=>await caches.match(offline)||Response.error()));return;}
 const relative=url.pathname.slice(scope.pathname.length);
 if(url.search||!/^assets\/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2|svg|png)$/.test(relative))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;})());
});
