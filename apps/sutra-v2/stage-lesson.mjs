// Copy only the explicit existing fixture artifacts; no legacy deployment changes.
import {copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const source=new URL('../sutra/public/',import.meta.url),target=new URL('./dist/',import.meta.url);
for(const name of ['content/content-profile.json','content/source-catalog.json','transcripts/synthetic-timing.txt','media/timing-fixture.mp4','_headers']){
 const dst=fileURLToPath(new URL(name,target));await mkdir(dirname(dst),{recursive:true});await copyFile(new URL(name,source),dst);
}
