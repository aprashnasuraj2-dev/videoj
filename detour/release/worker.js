const DIST_BRANCH = 'detour-dist-50ac9661e315';
const SOURCE_SHA = '50ac9661e315f099d3121850a57dd398cbeb5865';
const RAW_BASE = `https://raw.githubusercontent.com/aprashnasuraj2-dev/videoj/${DIST_BRANCH}/detour/published-dist`;
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  mp4: 'video/mp4', vtt: 'text/vtt; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', svg: 'image/svg+xml', json: 'application/json; charset=utf-8', webp: 'image/webp'
};
addEventListener('fetch', event => event.respondWith(handle(event.request)));

function assetPath(pathname) {
  if (pathname === '/') return '/index.html';
  if (pathname.endsWith('/')) return pathname + 'index.html';
  return pathname;
}
function contentType(path) {
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '';
  return MIME[ext] || 'application/octet-stream';
}
function commonHeaders(headers, path) {
  const out = new Headers(headers);
  out.set('Content-Type', contentType(path));
  out.set('X-DETOUR-Source-SHA', SOURCE_SHA);
  out.set('X-DETOUR-Dist-Branch', DIST_BRANCH);
  out.set('X-Content-Type-Options', 'nosniff');
  out.set('Referrer-Policy', 'no-referrer');
  out.set('Cache-Control', path.endsWith('.html') ? 'public, max-age=60' : 'public, max-age=86400, immutable');
  if (path.endsWith('.mp4')) out.set('Accept-Ranges', 'bytes');
  return out;
}
function rangeSlice(buffer, header) {
  const size = buffer.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match) return { invalid: true, size };
  let start, end;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return { invalid: true, size };
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return { invalid: true, size };
  end = Math.min(end, size - 1);
  return { start, end, size, body: buffer.slice(start, end + 1) };
}
async function frozen(path) {
  const key = SOURCE_SHA + path;
  const object = await DETOUR_ASSETS.get(key);
  if (object) {
    return { status: 200, body: await object.arrayBuffer(), storage: 'r2' };
  }
  const upstream = await fetch(RAW_BASE + path);
  if (!upstream.ok) return { status: upstream.status, body: null, storage: 'upstream' };
  const body = await upstream.arrayBuffer();
  await DETOUR_ASSETS.put(key, body, {
    httpMetadata: {
      contentType: contentType(path),
      cacheControl: path.endsWith('.html') ? 'public, max-age=60' : 'public, max-age=86400, immutable',
    },
    customMetadata: { sourceSha: SOURCE_SHA, distBranch: DIST_BRANCH },
  });
  return { status: 200, body, storage: 'r2-hydrated' };
}
async function handle(request) {
  const url = new URL(request.url);
  const path = assetPath(url.pathname);
  if (path.includes('\\\\') || path.split('/').includes('..')) return new Response('Bad path', { status: 400 });
  const full = await frozen(path);
  if (full.status !== 200) {
    return new Response(full.status === 404 ? 'Not found' : 'Upstream unavailable', {
      status: full.status === 404 ? 404 : 502,
      headers: { 'X-DETOUR-Upstream-Status': String(full.status) },
    });
  }
  const headers = commonHeaders({}, path);
  headers.set('Content-Length', String(full.body.byteLength));
  headers.set('X-DETOUR-Storage', full.storage);
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
  const range = request.headers.get('Range');
  if (!range) return new Response(full.body, { status: 200, headers });
  const part = rangeSlice(full.body, range);
  if (part.invalid) {
    headers.set('Content-Range', `bytes */${part.size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${part.start}-${part.end}/${part.size}`);
  headers.set('Content-Length', String(part.end - part.start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(part.body, { status: 206, headers });
}
