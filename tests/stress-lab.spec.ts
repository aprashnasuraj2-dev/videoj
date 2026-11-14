import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const validAdapter=`
export default {
  name: 'Plain video fixture',
  async mount(host, input) {
    const root = document.createElement('section');
    root.style.width = '100%';
    const media = document.createElement(input.mediaKind === 'audio' ? 'audio' : 'video');
    media.controls = true;
    media.preload = 'metadata';
    media.src = input.source;
    if (input.poster && media instanceof HTMLVideoElement) media.poster = input.poster;
    if (input.chapters) {
      const track = document.createElement('track');
      track.kind = 'chapters';
      track.src = input.chapters;
      track.default = true;
      media.append(track);
    }
    for (const c of input.captions || []) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.src = c.src;
      track.label = c.label;
      track.srclang = c.language;
      track.default = Boolean(c.default);
      media.append(track);
    }
    root.append(media);
    host.append(root);
    return { root, media, destroy(){ media.pause(); root.remove(); } };
  }
};`;

async function openLab(page:any){
  await page.goto('/stress.html?case=original');
  await expect(page.locator('#portable-loader-status')).toContainText('Built-in DHAGO reference adapter active');
}

async function loadLocal(page:any,source:string,name='adapter.mjs'){
  await page.locator('#portable-adapter-file').setInputFiles({
    name,
    mimeType:'text/javascript',
    buffer:Buffer.from(source),
  });
}

test('built-in reference produces structured baseline and a real 240px result',async({page})=>{
  await openLab(page);
  await page.locator('#portable-case').selectOption('baseline');
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr')).toHaveCount(1);
  await expect(page.locator('#portable-result-body tr').first()).toHaveAttribute('data-status','pass');

  await page.locator('#portable-case').selectOption('narrow-240');
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr')).toHaveCount(2);
  await expect(page.locator('#portable-result-body tr').last()).toContainText('240px container');
  await expect(page.locator('#portable-result-body tr').last()).toHaveAttribute('data-status','pass');
  await expect.poll(()=>page.locator('#portable-direct-host').evaluate((el:HTMLElement)=>Math.round(el.getBoundingClientRect().width))).toBe(240);
});

test('forced colors remains NOT RUN when the real environment is inactive',async({page})=>{
  await openLab(page);
  const active=await page.evaluate(()=>matchMedia('(forced-colors: active)').matches);
  test.skip(active,'This assertion is specifically for a normal non-forced-colors environment.');
  await page.locator('#portable-case').selectOption('forced-colors');
  await page.getByRole('button',{name:'Run current case'}).click();
  const row=page.locator('#portable-result-body tr').last();
  await expect(row).toHaveAttribute('data-status','not-run');
  await expect(row).toContainText('NOT RUN');
});

test('local adapter stays in an opaque sandbox and replaces the old built-in player',async({page})=>{
  await openLab(page);
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-direct-host .dhago')).toHaveCount(1);

  await loadLocal(page,validAdapter);
  await expect(page.locator('#portable-loader-status')).toContainText('Loaded locally: Plain video fixture');
  await expect(page.locator('#portable-direct-host .dhago')).toHaveCount(0);
  const frame=page.locator('#portable-sandbox-host iframe');
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute('sandbox','allow-scripts');

  await page.locator('#portable-case').selectOption('narrow-240');
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr').last()).toHaveAttribute('data-status','pass');
  await expect(page.locator('#portable-result-body tr').last()).toContainText('240px container');
});

test('invalid adapter contracts are loader errors, not skin failures',async({page})=>{
  await openLab(page);
  await loadLocal(page,`export default { name: 'Missing mount' };`);
  await expect(page.locator('#portable-loader-status')).toContainText('invalid-contract');
  await expect(page.locator('#portable-result-body tr')).toHaveCount(0);
});

test('adapter mount exceptions and missing media become structured FAIL results',async({page})=>{
  await openLab(page);
  await loadLocal(page,`export default {name:'Throws',mount(){throw new Error('fixture mount exploded')}};`,'throws.mjs');
  await expect(page.locator('#portable-loader-status')).toContainText('Loaded locally: Throws');
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr').last()).toHaveAttribute('data-status','fail');
  await expect(page.locator('#portable-result-body tr').last()).toContainText('fixture mount exploded');

  await loadLocal(page,`export default {name:'No media',mount(host){const root=document.createElement('div');root.textContent='controls only';host.append(root);return {root,destroy(){root.remove()}}}};`,'no-media.mjs');
  await expect(page.locator('#portable-loader-status')).toContainText('Loaded locally: No media');
  await page.getByRole('button',{name:'Run current case'}).click();
  const row=page.locator('#portable-result-body tr').last();
  await expect(row).toHaveAttribute('data-status','fail');
  await expect(row).toContainText('No media element exposed');
});

test('stale or forged parent messages cannot add a result',async({page})=>{
  await openLab(page);
  await loadLocal(page,validAdapter);
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr')).toHaveCount(1);
  await page.evaluate(()=>window.postMessage({
    type:'stress:result',
    sessionId:'stale-session',
    result:{caseId:'baseline',caseLabel:'FORGED',adapterName:'forged',status:'pass',assertions:[],environment:{},durationMs:0,notes:[]}
  },'*'));
  await page.waitForTimeout(100);
  await expect(page.locator('#portable-result-body tr')).toHaveCount(1);
  await expect(page.locator('#portable-result-body')).not.toContainText('FORGED');
});

test('JSON and Markdown report serialization omit adapter source and local paths',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await openLab(page);
  await page.getByRole('button',{name:'Run current case'}).click();

  await page.getByRole('button',{name:'Copy JSON'}).click();
  const json=await page.evaluate(()=>navigator.clipboard.readText());
  expect(json).toContain('"caseId": "baseline"');
  expect(json).not.toContain('export default');
  expect(json).not.toMatch(/[A-Z]:\\\\|\/Users\/|\/home\//);

  await page.getByRole('button',{name:'Copy Markdown'}).click();
  const md=await page.evaluate(()=>navigator.clipboard.readText());
  expect(md).toContain('# Skin Stress Lab report');
  expect(md).toContain('| Baseline | PASS |');
  expect(md).not.toContain('export default');
});

test('Stress Lab portable UI is keyboard reachable and introduces no serious/critical axe findings',async({page})=>{
  await openLab(page);
  await page.locator('#portable-use-dhago').focus();
  await expect(page.locator('#portable-use-dhago')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#portable-adapter-url')).toBeFocused();

  const report=await new AxeBuilder({page}).analyze();
  const severe=report.violations.filter(v=>v.impact==='serious'||v.impact==='critical');
  expect(severe,JSON.stringify(severe,null,2)).toEqual([]);
});


test('ESM adapter URL mode loads a CORS-readable module without joining the parent origin',async({page})=>{
  await openLab(page);
  const url='data:text/javascript;charset=utf-8,'+encodeURIComponent(validAdapter);
  await page.locator('#portable-adapter-url').fill(url);
  await page.getByRole('button',{name:'Load URL'}).click();
  await expect(page.locator('#portable-loader-status')).toContainText('Loaded: Plain video fixture');
  await expect(page.locator('#portable-sandbox-host iframe')).toHaveAttribute('sandbox','allow-scripts');
  await page.locator('#portable-case').selectOption('baseline');
  await page.getByRole('button',{name:'Run current case'}).click();
  await expect(page.locator('#portable-result-body tr').last()).toHaveAttribute('data-status','pass');
});

test('network fixture worker only handles the reserved Stress Lab path',async({page})=>{
  await openLab(page);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.stressFixtures)).toBe('service-worker');
  const proof=await page.evaluate(async()=>{
    const malformed=await fetch('/__stress-fixtures/malformed.vtt',{cache:'no-store'});
    const wrong=await fetch('/__stress-fixtures/media.mp4?mode=wrong-mime',{headers:{Range:'bytes=0-1023'},cache:'no-store'});
    const unrelated=await fetch('/media/poster.webp',{cache:'no-store'});
    return {
      malformedStatus:malformed.status,
      malformedHeader:malformed.headers.get('x-dhago-stress-fixture'),
      malformedText:await malformed.text(),
      wrongStatus:wrong.status,
      wrongType:wrong.headers.get('content-type'),
      wrongHeader:wrong.headers.get('x-dhago-stress-fixture'),
      unrelatedHeader:unrelated.headers.get('x-dhago-stress-fixture'),
    };
  });
  expect(proof.malformedStatus).toBe(200);
  expect(proof.malformedHeader).toBe('1');
  expect(proof.malformedText).toContain('Reversed time');
  expect([200,206]).toContain(proof.wrongStatus);
  expect(proof.wrongType).toContain('text/plain');
  expect(proof.wrongHeader).toBe('1');
  expect(proof.unrelatedHeader).toBeNull();
});
