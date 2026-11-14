const clamp01=(value:number)=>Math.min(1,Math.max(0,value));

const STAGES=[
  {id:'fibre',label:'RAW FIBRE'},
  {id:'twist',label:'TWIST INTO THREAD'},
  {id:'warp',label:'WARP FORMS'},
  {id:'weft',label:'WARP + WEFT'},
] as const;

function buildFilmLoom(){
  const root=document.createElement('div');
  root.className='dhago-film-loom';
  root.setAttribute('aria-hidden','true');

  const field=document.createElement('div');
  field.className='dhago-film-loom-field';

  const fibreLayer=document.createElement('div');
  fibreLayer.className='dhago-film-fibres';
  for(let i=0;i<18;i++){
    const thread=document.createElement('span');
    thread.className='dhago-film-fibre';
    thread.style.setProperty('--i',String(i));
    thread.style.setProperty('--x',String((i*37)%97));
    thread.style.setProperty('--y',String((i*53)%89));
    thread.style.setProperty('--tilt',String(-34+((i*29)%68)));
    fibreLayer.append(thread);
  }

  const twist=document.createElement('div');
  twist.className='dhago-film-twist';
  for(let i=0;i<6;i++){
    const strand=document.createElement('span');
    strand.style.setProperty('--i',String(i));
    twist.append(strand);
  }

  const warp=document.createElement('div');
  warp.className='dhago-film-warp';
  for(let i=0;i<24;i++){
    const strand=document.createElement('span');
    strand.style.setProperty('--i',String(i));
    warp.append(strand);
  }

  const weft=document.createElement('div');
  weft.className='dhago-film-weft';
  for(let i=0;i<14;i++){
    const strand=document.createElement('span');
    strand.style.setProperty('--i',String(i));
    weft.append(strand);
  }

  const shuttle=document.createElement('span');
  shuttle.className='dhago-film-shuttle';

  const witness=document.createElement('div');
  witness.className='dhago-film-witness';
  witness.innerHTML='<span class="dhago-film-witness-kicker">MEDIA TIME → TEXTILE STATE</span><span class="dhago-film-witness-stage"></span><span class="dhago-film-witness-time"></span>';

  field.append(fibreLayer,twist,warp,weft,shuttle);
  root.append(field,witness);
  return root;
}

/** Render truthful media state without taking ownership of the Video.js controls. */
export function connectLivingLoom(media: HTMLMediaElement, container: HTMLElement) {
  let started = false;
  let loading = false;
  let seeking = false;
  let interruption: 'waiting' | 'stalled' | undefined;
  let state = 'idle';
  let progress = '';
  let stage = '';

  const loom=buildFilmLoom();
  container.append(loom);
  const stageLabel=loom.querySelector<HTMLElement>('.dhago-film-witness-stage')!;
  const timeLabel=loom.querySelector<HTMLElement>('.dhago-film-witness-time')!;

  function sync(event?: Event) {
    if (event && !media.isConnected) return;
    switch (event?.type) {
      case 'loadstart':
      case 'emptied':
        loading = event.type === 'loadstart';
        started = false;
        seeking = false;
        interruption = undefined;
        break;
      case 'playing':
        if (!media.paused && !media.seeking && media.readyState >= 3) {
          started = true;
          interruption = undefined;
        }
        break;
      case 'timeupdate':
        if (!media.paused && !media.seeking && media.readyState >= 3) {
          started = true;
        }
        break;
      case 'waiting':
      case 'stalled':
        if (!media.paused && !media.ended && !media.error) {
          interruption = event.type;
        }
        break;
      case 'seeking':
        seeking = true;
        if (interruption === 'stalled') interruption = 'waiting';
        break;
      case 'seeked':
        seeking = false;
        if (media.readyState >= 3) interruption = undefined;
        break;
      case 'canplay':
      case 'pause':
      case 'ended':
      case 'error':
        interruption = undefined;
        break;
    }

    const duration = media.duration;
    const time = media.currentTime;
    const finite = Number.isFinite(duration) && duration > 0 && Number.isFinite(time);
    const ratio=finite?clamp01(time/duration):0;
    const activeSeek = !media.error && (seeking || media.seeking);
    const complete = finite && !activeSeek && !media.error && media.ended && time >= duration - .05;
    const blocked = Boolean(interruption && !media.paused && !complete && !media.error);
    const nextProgress = finite ? `${(100 * ratio).toFixed(3)}%` : '';
    if (nextProgress !== progress) {
      progress = nextProgress;
      if (progress) container.style.setProperty('--dhago-progress', progress);
      else container.style.removeProperty('--dhago-progress');
    }

    if(finite){
      const scaled=Math.min(3.999999,ratio*4);
      const stageIndex=Math.min(3,Math.floor(scaled));
      const phase=ratio>=1?1:scaled-stageIndex;
      const nextStage=STAGES[stageIndex];
      container.style.setProperty('--dhago-time-ratio',ratio.toFixed(5));
      container.style.setProperty('--dhago-phase',phase.toFixed(5));
      container.style.setProperty('--dhago-stage-index',String(stageIndex));
      container.dataset.weaveStage=nextStage.id;
      stageLabel.textContent=nextStage.label;
      timeLabel.textContent=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
      if(stage!==nextStage.id){
        stage=nextStage.id;
        loom.dataset.stage=nextStage.id;
      }
    }else{
      container.style.removeProperty('--dhago-time-ratio');
      container.style.removeProperty('--dhago-phase');
      container.style.removeProperty('--dhago-stage-index');
      delete container.dataset.weaveStage;
      delete loom.dataset.stage;
      stageLabel.textContent='';
      timeLabel.textContent='';
      stage='';
    }

    container.toggleAttribute('data-weave-finite', finite);
    container.toggleAttribute('data-weave-complete', complete);
    container.toggleAttribute('data-thread-seeking', activeSeek);
    container.toggleAttribute('data-thread-buffering', blocked);
    container.toggleAttribute('data-thread-stalled', blocked && !activeSeek && interruption === 'stalled');

    let nextState: string;
    if (media.error) nextState = 'error';
    else if (activeSeek) nextState = 'seeking';
    else if (complete || media.ended) nextState = 'ended';
    else if (blocked && interruption) nextState = interruption;
    else if (!media.paused) nextState = started && media.readyState >= 3 ? 'playing' : 'loading';
    else if (started || time > 0) nextState = 'paused';
    else if (media.readyState > 0) nextState = 'ready';
    else nextState = loading ? 'loading' : 'idle';

    if (nextState !== state) {
      state = nextState;
      container.dataset.playbackState = state;
    }
  }

  container.dataset.playbackState = state;
  for (const type of [
    'loadstart', 'emptied', 'loadedmetadata', 'durationchange', 'canplay',
    'play', 'playing', 'pause', 'timeupdate', 'seeking', 'seeked',
    'waiting', 'stalled', 'ended', 'error',
  ]) media.addEventListener(type, sync);
}
