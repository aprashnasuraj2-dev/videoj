// V2 static artifact only. Never use this policy for V1 or API responses.
export const V2_STATIC_CSP="default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; worker-src 'self' blob:; connect-src 'self'; frame-src 'none'; manifest-src 'self'";
export const GUIDE_ORIGIN='https://sutra-guide.aafnaipatro.com';
export function rootStaticPolicy(headers){
 const first=headers.split(/\r?\n\r?\n/,1)[0].split(/\r?\n/);
 if(first[0]!=='/*')throw Error('Missing wildcard static header block');
 const values=first.filter(l=>/^\s*Content-Security-Policy\s*:/i.test(l));
 if(values.length!==1)throw Error('Expected exactly one wildcard CSP');
 return values[0].replace(/^\s*Content-Security-Policy\s*:\s*/i,'');
}
export function assertV2StaticHeaders(headers){
 if(rootStaticPolicy(headers)!==V2_STATIC_CSP)throw Error('V2 static CSP drift');
 const policies=headers.split(/\r?\n/).filter(l=>/^\s*Content-Security-Policy\s*:/i.test(l));
 if(policies.some((l,i)=>l.includes("'unsafe-eval'")||i>0&&l.includes("'wasm-unsafe-eval'")))throw Error('Unexpected eval policy');
 const cors=[];
 for(const block of headers.trim().split(/\r?\n\r?\n/)){const [path,...lines]=block.split(/\r?\n/);for(const line of lines){if(/^\s*Access-Control-/i.test(line)){if(line.trim()!=='Access-Control-Allow-Origin: *')throw Error('Unexpected static CORS field');cors.push(path);}}}
 if(JSON.stringify(cors.sort())!==JSON.stringify(['/agents/agent-manifest.json','/agents/investigation.network.json','/agents/links.json','/agents/peer-investigation.network.json','/agents/reviewed-investigation.network.json']))throw Error('V2 CORS must be limited to public graph artifacts');
 return headers;
}
export function guideCandidateHeaders(headers){
 assertV2StaticHeaders(headers);
 return headers.replace(V2_STATIC_CSP,V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
}
