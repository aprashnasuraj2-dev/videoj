export type PortableStressCaseId='baseline'|'narrow-240'|'malformed-cues'|'missing-media'|'forced-colors';

export interface PortableStressFixture {
  id:PortableStressCaseId;
  label:string;
  description:string;
  width?:string;
  missingMedia?:boolean;
  malformedCues?:boolean;
  requiresForcedColors?:boolean;
}
export interface PortableSkinMount {
  root:HTMLElement;
  media:HTMLMediaElement;
  destroy?:()=>void;
}
export interface PortableSkinAdapter {
  name:string;
  mount:(host:HTMLElement,input:{source:string;chapters?:string})=>PortableSkinMount|Promise<PortableSkinMount>;
}
export interface PortableStressRun {
  fixture:PortableStressFixture;
  mount:PortableSkinMount;
  cleanup:()=>void;
  environmentSatisfied:boolean;
}

export const portableStressFixtures:readonly PortableStressFixture[]=[
  {id:'baseline',label:'Baseline',description:'Working source at normal width.'},
  {id:'narrow-240',label:'240px container',description:'Real player mounted in a 240px host.',width:'240px'},
  {id:'malformed-cues',label:'Malformed cues',description:'Out-of-order, overlapping, zero-length and out-of-range chapter cues.',malformedCues:true},
  {id:'missing-media',label:'Missing media',description:'Deliberately unavailable media source to exercise error and recovery UI.',missingMedia:true},
  {id:'forced-colors',label:'Forced colors',description:'Requires the browser/automation environment to activate forced-colors: active.',requiresForcedColors:true},
] as const;

export const malformedChapterVtt=(duration=64)=>`WEBVTT

00:35.000 --> 02:00.000
Overruns duration

00:00.000 --> 00:12.000
First

00:07.000 --> 00:19.000
Overlaps first

00:25.000 --> 00:31.000
Gap before this

00:19.000 --> 00:19.000
Zero length
`;

/**
 * Minimal adapter-based stress harness for any web media skin.
 * It deliberately does not know about DHAGO or Video.js.
 */
export function createSkinStressHarness(options:{
  source:string;
  missingSource?:string;
  adapter:PortableSkinAdapter;
}){
  let activeCleanup=()=>{};
  const run=async(host:HTMLElement,id:PortableStressCaseId):Promise<PortableStressRun>=>{
    activeCleanup();
    const fixture=portableStressFixtures.find(item=>item.id===id);
    if(!fixture)throw new Error(`Unknown stress case: ${id}`);
    host.replaceChildren();
    host.style.width=fixture.width??'100%';
    const urls:string[]=[];
    let chapters:string|undefined;
    if(fixture.malformedCues){
      chapters=URL.createObjectURL(new Blob([malformedChapterVtt()],{type:'text/vtt'}));
      urls.push(chapters);
    }
    const source=fixture.missingMedia?(options.missingSource??'./__skin-stress-missing-media.mp4'):options.source;
    const mounted=await options.adapter.mount(host,{source,chapters});
    const environmentSatisfied=!fixture.requiresForcedColors||matchMedia('(forced-colors: active)').matches;
    activeCleanup=()=>{
      mounted.destroy?.();
      mounted.root.remove();
      urls.forEach(URL.revokeObjectURL);
      host.style.removeProperty('width');
    };
    return {fixture,mount:mounted,cleanup:activeCleanup,environmentSatisfied};
  };
  return {run,destroy:()=>activeCleanup(),fixtures:portableStressFixtures};
}
