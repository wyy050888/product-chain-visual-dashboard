import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../../',import.meta.url),platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
export async function platformSelect(page){
 const pages=JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8')).pages;
 for(const entry of pages){
  await page.goto(new URL(entry.file,root).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  const missing=await page.evaluate(names=>[...document.querySelectorAll('select')].filter(s=>
   !s.hidden&&!s.multiple&&!s.hasAttribute('data-platform-enhanced')&&[...s.options].filter(o=>names.includes(o.textContent.trim())).length>=2
  ).filter(s=>!s.uiPlatformControl||!s.uiPlatformControl.button.isConnected).map(s=>s.id||s.getAttribute('aria-label')),platforms);
  assert.deepEqual(missing,[],'独立页面的平台下拉全部覆盖：'+entry.file);
 }
 await page.goto(new URL('index.html',root).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#new"]').click();
 const native=page.locator('#new [data-nsp-filter="channel"]'),trigger=page.locator('#new .ui-platform-trigger');
 const panel=()=>page.locator('.ui-platform-options:popover-open');
 await trigger.click();assert.deepEqual(await panel().locator('[role=option]').allTextContents(),['全部',...platforms]);
 assert.equal(await panel().locator('img').count(),6);assert.equal(await panel().locator('[data-ui-platform-value=all] img').count(),0);
 await page.waitForFunction(()=>[...document.querySelectorAll('.ui-platform-options:popover-open img')].every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(new Set(await panel().locator('img').evaluateAll(ns=>ns.map(n=>n.src))).size,6,'六平台图标对应唯一');
 await panel().locator('[data-ui-platform-value="快手"]').click();assert.equal(await native.inputValue(),'快手');
 assert.equal(await trigger.innerText(),'快手');assert.equal(await trigger.locator('img').count(),1);
 assert((await page.evaluate(()=>dashboardNewProductsSnapshot())).visible.every(p=>p.salesChannels.includes('快手')));
 await page.locator('#newtop svg [data-nsp-channel="京东"]').click();assert.equal(await trigger.innerText(),'京东','图表联动同步选中图标');
 await native.selectOption('抖音');assert.equal(await trigger.innerText(),'抖音','原select兼容外部修改');
 await trigger.click();await page.keyboard.press('Escape');assert.equal(await panel().count(),0);assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
 assert.equal(await native.inputValue(),'拼多多','上下及首尾键与Enter选择');
 await native.selectOption('all');assert.equal(await trigger.locator('img').count(),0,'全部不显示伪平台图标');
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});
  const toggle=page.locator('[data-nsp-filter-toggle]');if(!(await trigger.isVisible()))await toggle.click();
  await trigger.click();const box=await panel().boundingBox();assert(box.x>=7&&box.x+box.width<=width-7,'下拉面板不越界 '+width);
  await page.keyboard.press('Escape');assert(await page.locator('#new').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'模块无溢出 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>{
  const host=document.createElement('div');host.id='platform-select-fixture';host.className='ui-business-filters';
  host.innerHTML='<label class="unified-input-group"><span class="unified-field-name">平台</span><select id="platform-numeric" aria-label="数字键平台"><option value="">全部</option><option value="0">抖音</option><option value="1">快手</option><option value="2" disabled>京东</option></select></label><select id="platform-untouched"><option>康佳</option><option>创维</option></select><details class="pf-multi"><summary class="unified-input-group"><span class="pf-multi-value">全部</span></summary><select id="platform-multiple" multiple hidden><option value="all" selected>全部</option><option value="0">抖音</option><option value="1">快手</option></select><div class="pf-multi-menu"><label class="pf-multi-option"><input type="checkbox" data-pf-multi-option value="0"><span>抖音</span></label><label class="pf-multi-option"><input type="checkbox" data-pf-multi-option value="1"><span>快手</span></label></div></details>';
  const single=document.createElement('label');single.className='unified-input-group';single.innerHTML='<span class="unified-field-name">平台</span><select id="platform-single" aria-label="单个平台"><option value="jd">京东</option></select>';host.append(single);
  document.body.append(host);window.platformFixtureChanges=0;window.platformFixtureInputs=0;host.querySelector('#platform-numeric').onchange=()=>window.platformFixtureChanges++;host.querySelector('#platform-numeric').oninput=()=>window.platformFixtureInputs++;
 });
 const fixture=page.locator('#platform-select-fixture'),numeric=fixture.locator('#platform-numeric').locator('..').locator('.ui-platform-trigger');
 assert.equal(await fixture.locator('#platform-single').locator('..').locator('.ui-platform-trigger img').count(),1,'仅有一个平台的下拉同样带图标');
 await numeric.click();assert(await panel().locator('[data-ui-platform-value="2"]').isDisabled());
 await panel().locator('[data-ui-platform-value="0"]').click();assert.equal(await page.locator('#platform-numeric').inputValue(),'0');assert.equal(await page.evaluate(()=>platformFixtureChanges),1,'保留数字键且只触发一次业务change');
 assert.equal(await page.evaluate(()=>platformFixtureInputs),1,'保留原生input事件语义');
 assert.equal(await page.locator('#platform-untouched').getAttribute('data-ui-platform-select'),null,'不改品牌枚举');
 await page.locator('#platform-multiple').selectOption('1',{force:true});
 assert.equal(await fixture.locator('.pf-multi-option img').count(),2);assert.equal(await fixture.locator('.pf-multi-value img').count(),1,'多选复用原控件并补图标');
 await page.evaluate(()=>{document.querySelector('#platform-numeric').insertAdjacentHTML('beforeend','<option value="3">天猫</option>')});
 await numeric.click();assert.equal(await panel().locator('[data-ui-platform-value="3"] img').count(),1,'动态选项无需重新进入页面');
 await page.keyboard.press('Escape');await fixture.evaluate(n=>n.remove());
 // 原有产品抽屉仍沿用图标按钮组，不重复出现两套平台选择。
 await page.locator('#newtable [data-nsp-view]').first().click();await page.locator('.up-detail').waitFor();
 await page.waitForFunction(()=>document.querySelector('#up-platform')?.hasAttribute('data-platform-enhanced'));
 assert.equal(await page.locator('#dialogbody .drawer-platform-switch .platform-mark').count(),6);
 assert.equal(await page.locator('#dialogbody #up-platform').getAttribute('data-ui-platform-select'),null);
 await page.locator('#close').click();
 console.log('通过：全部独立页面审计、六平台图标、图表/原select联动、键盘与窗口边界、动态数字键/禁用选项、多选及产品抽屉。');
}
