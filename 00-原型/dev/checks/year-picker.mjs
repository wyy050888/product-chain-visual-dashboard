import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),out=new URL('../../../outputs/year-picker/',import.meta.url);
export async function yearPicker(page){
 fs.mkdirSync(out,{recursive:true});
 const panel=()=>page.locator('.ui-year-panel:popover-open');
 const trigger=select=>select.locator('..').locator(':scope>.ui-year-trigger');
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const inventory=async label=>{
  const audit=await page.evaluate(()=>[...document.querySelectorAll('select')].filter(s=>!s.hidden&&!s.multiple&&getComputedStyle(s).display!=='none'&&[...s.options].some(o=>/^\d{4}\s*年?$/.test(o.textContent.trim()))).map(s=>({id:s.id||s.getAttribute('aria-label'),mounted:!!s.uiYearControl?.button.isConnected,visible:s.checkVisibility()})));
  assert.deepEqual(audit.filter(s=>!s.mounted),[],label+' 年份组件全部挂载');return audit;
 };
 for(const entry of (process.env.DASHBOARD_YEAR_SKIP_INVENTORY?[]:JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8')).pages)){
  await page.goto(new URL(entry.file,root).href,{waitUntil:'domcontentloaded'});await ready();
  const rows=await inventory(entry.file);
  const visible=page.locator('select[data-ui-year-source]:visible');
  for(let i=0;i<await visible.count();i++){
   const select=visible.nth(i),button=trigger(select);if(!await button.isVisible())continue;
   await button.click();assert.equal(await panel().locator('[data-ui-year-value]').count(),10,entry.file);
   assert.equal(await panel().locator('.ui-year-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),4);
   await page.keyboard.press('Escape');
  }
  console.log('年份入口：'+entry.file+' '+rows.length+' 个');
 }
 await page.goto(new URL('index.html',root).href,{waitUntil:'domcontentloaded'});await ready();
 await page.locator('#time-risk [data-time-mode=year]').click();
 const risk=page.locator('#time-risk [data-time-year]');
 await trigger(risk).click();assert.equal(await panel().locator('.ui-year-heading span').innerText(),'2020 年 - 2029 年');
 const options=await risk.locator('option').evaluateAll(ns=>ns.map(n=>Number(n.value)));
 for(const year of [2025,2026,2027])assert.equal(await panel().locator('[data-ui-year-value="'+year+'"]').isDisabled(),!options.includes(year));
 await panel().screenshot({path:fileURLToPath(new URL('risk-year-grid.png',out))});
 await panel().locator('[data-ui-year-value="2025"]').click();assert.equal(await risk.inputValue(),'2025');
 assert.match(await trigger(risk).innerText(),/2025/);
 await trigger(risk).focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await risk.inputValue(),String(Math.max(...options)));
 await page.locator('a[href="#new"]').click();await page.locator('[data-nsp-assessment-entry]').click();
 const assessment=page.locator('[data-nsp-assess-year]');await trigger(assessment).click();
 assert(await page.locator('#dialog').isVisible());await page.keyboard.press('Escape');assert(await page.locator('#dialog').isVisible(),'Esc 只关闭年份面板');
 await trigger(assessment).click();await panel().locator('[data-ui-year-value="2025"]').click();assert.equal(await assessment.inputValue(),'2025','重绘后的考核年份与数据联动');
 await trigger(assessment).click();await page.screenshot({path:fileURLToPath(new URL('assessment-year-grid.png',out))});await page.keyboard.press('Escape');await page.locator('#close').click();
 for(const width of [1920,1440,1024,390,320]){
  await page.setViewportSize({width,height:1080});await trigger(risk).click();const box=await panel().boundingBox();assert(box.x>=7&&box.x+box.width<=width-7&&box.y>=7&&box.y+box.height<=1080-7,'面板不越界 '+width);await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>{
  const host=document.createElement('div');host.id='year-fixture';host.style.cssText='position:fixed;top:200px;left:200px;z-index:99999;display:flex;gap:10px;background:white';
  host.innerHTML='<select id="test-year" aria-label="测试年份"><option value="all">全部</option>'+Array.from({length:24},(_,i)=>'<option value="key-'+(2018+i)+'" '+(i===8?'selected':'')+' '+(i===9?'disabled':'')+'>'+(2018+i)+'年</option>').join('')+'</select><select id="test-id"><option value="2026">产品2026</option></select><select id="test-multiple" multiple><option>2026年</option></select>';
  document.body.append(host);window.yearChanges=0;window.yearInputs=0;host.querySelector('#test-year').onchange=()=>window.yearChanges++;host.querySelector('#test-year').oninput=()=>window.yearInputs++;
 });
 const fixture=page.locator('#test-year');await trigger(fixture).click();assert(await panel().locator('[data-ui-year-value="2027"]').isDisabled());
 await panel().locator('[data-ui-year-step="-1"]').click();assert.equal(await panel().locator('.ui-year-heading span').innerText(),'2010 年 - 2019 年');
 await panel().locator('[data-ui-year-value="2018"]').click();assert.equal(await fixture.inputValue(),'key-2018');assert.equal(await page.evaluate(()=>yearChanges),1);assert.equal(await page.evaluate(()=>yearInputs),1);
 await trigger(fixture).click();await panel().locator('[data-ui-year-clear]').click();assert.equal(await fixture.inputValue(),'all');
 assert.equal(await page.locator('#test-id,#test-multiple').evaluateAll(ns=>ns.filter(n=>n.uiYearControl).length),0,'业务编码和多选不误替换');
 await page.evaluate(()=>{const source=document.querySelector('#test-year');source.insertAdjacentHTML('beforeend','<option value="2049">2049年</option>');source.value='2049';source.dispatchEvent(new Event('change',{bubbles:true}))});
 await trigger(fixture).click();assert.equal(await panel().locator('[aria-pressed=true]').innerText(),'2049');await page.keyboard.press('Escape');
 // 程序赋值无需派发事件或依赖无关DOM变更，且不会重复触发业务change。
 const eventCount=await page.evaluate(()=>yearChanges);
 await fixture.evaluate(source=>{source.value='key-2019'});assert.match(await trigger(fixture).innerText(),/2019/);
 await fixture.evaluate(source=>{source.selectedIndex=[...source.options].findIndex(o=>o.value==='key-2026')});assert.match(await trigger(fixture).innerText(),/2026/);assert.equal(await page.evaluate(()=>yearChanges),eventCount);
 const redundantWrites=await page.evaluate(async()=>{
  let count=0;const observer=new MutationObserver(records=>{count+=records.filter(r=>r.target.matches('.ui-year-field,.ui-year-trigger')).length});observer.observe(document.body,{attributes:true,subtree:true});
  const source=document.querySelector('#test-year');source.value=source.value;
  for(let i=0;i<10;i++){const node=document.createElement('span');document.querySelector('#year-fixture').append(node);await new Promise(resolve=>setTimeout(resolve,0));node.remove()}
  await new Promise(resolve=>requestAnimationFrame(resolve));observer.disconnect();return count;
 });assert.equal(redundantWrites,0,'无关DOM更新及同值赋值不产生年份属性写入');
 await page.locator('#year-fixture').evaluate(n=>{const clone=n.cloneNode(true);clone.id='year-fixture-clone';clone.style.top='300px';clone.querySelectorAll('[id]').forEach(n=>n.id+='-clone');n.after(clone)});
 const cloned=page.locator('#test-year-clone');await cloned.selectOption('key-2026');await trigger(cloned).click();await panel().locator('[data-ui-year-value="2025"]').click();assert.equal(await cloned.inputValue(),'key-2025','克隆控件重新绑定');
 assert.equal(await page.locator('[id^=ui-year-panel-]').evaluateAll(ns=>ns.length-new Set(ns.map(n=>n.id)).size),0,'克隆后的弹层 ID 唯一');
 await page.locator('#year-fixture,#year-fixture-clone').evaluateAll(ns=>ns.forEach(n=>n.remove()));
 await page.locator('#lt-open-targets').evaluate(n=>n.click());await page.locator('#lt-year').waitFor();await trigger(page.locator('#lt-year')).click();assert(await panel().locator('[data-ui-year-value="2027"]').isEnabled(),'目标配置保留未来年份');await page.keyboard.press('Escape');
 await page.evaluate(()=>location.hash='#system-supplier-targets');await page.locator('#st-target-page').waitFor({state:'visible'});await trigger(page.locator('#st-year')).click();await panel().locator('[data-ui-year-value="2025"]').click();assert.equal(await page.locator('#st-year').inputValue(),'2025');
 await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor({state:'visible'});await trigger(page.locator('[data-cec-time-year]')).click();await panel().locator('[data-ui-year-value="2025"]').click();assert.equal(await page.locator('[data-cec-time-year]').inputValue(),'2025');assert.equal(await page.locator('#cec-editor,[data-cec-view],[data-cec-time-value]').count(),0);
 await page.goto(new URL('index.html',root).href,{waitUntil:'domcontentloaded'});await ready();await page.locator('a[href="#new"]').click();await page.locator('.nsp-launch-trigger').click();for(const width of [1920,390,320]){await page.setViewportSize({width,height:1080});if(!await page.locator('#nsp-launch-panel').isVisible()){if(!await page.locator('.nsp-launch-trigger').isVisible())await page.locator('[data-nsp-filter-toggle]').click();await page.locator('.nsp-launch-trigger').click()}const box=await page.locator('#nsp-launch-panel').boundingBox();assert(box.x>=7&&box.x+box.width<=width-7);assert(await page.locator('#nsp-launch-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'自然年份面板无横向溢出 '+width)}await page.setViewportSize({width:1920,height:1080});if(!await page.locator('#nsp-launch-panel').isVisible())await page.locator('.nsp-launch-trigger').click();assert.equal(await page.locator('#nsp-launch-panel [data-launch-value]').count(),10);assert.equal(await page.locator('#nsp-launch-panel .nsp-launch-options').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),4);await page.locator('[data-launch-value="2025"]').click();assert.equal((await page.evaluate(()=>dashboardNewProductsSnapshot())).filters.launchStart,'2025-01-01');
 await page.goto(new URL('数智罗盘/目标管理/目标管理.html',root).href,{waitUntil:'domcontentloaded'});await page.locator('#statYearTrigger').click();assert.equal(await page.locator('#periodPicker .calendar-grid button').count(),10);assert.equal(await page.locator('#periodPicker .calendar-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),4);await page.locator('#periodPicker [data-calendar-value="2025"]').click();assert.equal(await page.locator('#statYear').inputValue(),'2025');
 console.log('年份网格：十年翻页、四列布局、原业务联动、抽屉 Esc、响应式、动态选项及克隆通过');
}
