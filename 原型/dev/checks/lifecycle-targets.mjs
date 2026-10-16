import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
export async function lifecycleTargets(page){
 const sources=['00-samples.js','01-model.js'].map(name=>fs.readFileSync(new URL('../../src/modules/lifecycle-targets/'+name,import.meta.url),'utf8')).join('\n');
 const ctx=vm.createContext({localStorage:{getItem:()=>null}});vm.runInContext(sources,ctx);
 for(const total of [0,1,2,3,5,8,14,31,99999]){
  const values=Array.from({length:3},(_,m)=>ctx.ltMonthValue(total,m+1));
  assert.equal(values.reduce((a,b)=>a+b,0),total);assert(values.every(Number.isInteger));assert(values[0]>=values[1]&&values[1]>=values[2]);assert(values[0]-values[2]<=1);
 }
 for(const value of [null,'none','draft'])assert.equal(ctx.ltMonthValue(value,10),value);
 assert.equal(ctx.ltAggregate([0,0]).state,'complete');assert.equal(ctx.ltAggregate([null,0]).state,'partial');assert.equal(ctx.ltAggregate(['none','none']).state,'none');
 assert.equal(ctx.ltTargetFor(5,[0,1,2,3,4],{year:2026,mode:'quarter',value:4}).value,34,'品质整改合计包含新老品');
 assert.equal(ctx.ltTargetFor(6,[0,1,2,3,4],{year:2026,mode:'year',value:1}).state,'none');
 assert.equal(ctx.ltTargetFor(0,[0,1,2,3,4],{year:2027,mode:'year',value:1}).state,'missing');
 const audit=()=>page.evaluate(()=>lifecycleTargetsAudit());
 await page.evaluate(()=>localStorage.removeItem('lifecycle-quarter-targets-v1'));await page.reload();
 const actuals=(await audit()).dashboard.map(d=>[d.actual,d.yearActual]);
 const expectedActuals=(await audit()).legacyActuals;
 assert.deepEqual(actuals,expectedActuals,'目标来源变化不改变原有实际完成台账');
 await page.locator('#lt-open-targets').evaluate(el=>el.click());
 assert.equal(await page.evaluate(()=>location.hash),'#system-lifecycle-targets');assert(await page.locator('main.page').isHidden());
 assert.equal(await page.locator('#lt-system-nav').getAttribute('aria-current'),'page');
 assert(await page.locator('#lt-system-nav').evaluate(e=>e.getBoundingClientRect().right<=e.parentElement.getBoundingClientRect().right+1),'系统管理入口完整可见');
 assert.equal(await page.locator('#lt-table tbody tr').count(),9);
 assert.equal(await page.locator('[data-lt-number="0:0"]').inputValue(),'9');assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'0');
 assert.equal(await page.locator('[data-lt-state="1:0"]').inputValue(),'none');assert.equal(await page.locator('[data-lt-state="1:3"]').inputValue(),'draft');
 assert.equal(await page.locator('#lt-system .metric-help').count(),0);
 await page.locator('[data-lt-number="0:3"]').fill('8');
 await page.locator('[data-lt-view="month"]').click();
 let row=page.locator('#lt-table tbody tr').first();assert.deepEqual(await row.locator('td').allTextContents(),['3','3','3','5','5','4','2','2','1','3','3','2','36']);
 await page.locator('[data-lt-view="annual"]').click();assert.equal(await page.locator('#lt-categories').isVisible(),false);assert.equal(await page.locator('#lt-table tbody tr').first().locator('td').first().innerText(),'36');
 await page.locator('[data-lt-view="quarter"]').click();await page.locator('[data-lt-category="2"]').click();
 await page.locator('[data-lt-state="0:3"]').selectOption('target');await page.locator('[data-lt-number="0:3"]').fill('5');
 await page.locator('[data-lt-category="0"]').click();
 for(const invalid of ['-1','1.5','100000']){
  await page.locator('[data-lt-number="0:3"]').fill(invalid);await page.locator('#lt-save').click();
  assert.match(await page.locator('#lt-error').innerText(),/整数/);assert((await audit()).dirty.includes(2026));
 }
 // 切换类目仍能定位另一类目的非法值，且保留其他输入。
 await page.locator('[data-lt-category="1"]').click();await page.locator('#lt-save').click();assert.equal((await audit()).category,0);assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'100000');
 await page.locator('[data-lt-number="0:3"]').fill('8');
 await page.locator('#lt-year').selectOption('2027');assert.equal(await page.locator('[data-lt-state="0:0"]').inputValue(),'missing');
 await page.locator('[data-lt-state="0:0"]').selectOption('target');await page.locator('[data-lt-number="0:0"]').fill('11');
 await page.locator('#lt-year').selectOption('2026');assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'8');
 // 本地保存失败不更新生效数据，也不丢弃草稿。
 await page.evaluate(()=>{window.ltNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lifecycle-quarter-targets-v1')throw Error('blocked');return ltNativeSet.call(this,key,value)}});
 await page.locator('#lt-save').click();assert.match(await page.locator('#lt-error').innerText(),/保存失败/);assert.equal((await audit()).saved.years[2026].values[0][0][3],0);
 await page.evaluate(()=>{Storage.prototype.setItem=window.ltNativeSet;delete window.ltNativeSet});
 await page.locator('#lt-save').click();let state=await audit();assert.deepEqual(state.dirty,[]);assert.equal(state.saved.years[2027].values[0][0][0],11);
 assert.equal(state.dashboard[0].target,9);assert.deepEqual(state.dashboard.map(d=>[d.actual,d.yearActual]),actuals);
 await page.reload();assert(await page.locator('#lt-system').isVisible());assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'8');
 // 未保存离开：继续、放弃、保存三个入口均有真实结果。
 await page.locator('[data-lt-number="0:3"]').fill('9');await page.locator('#lt-return').click();await page.locator('#lt-stay').click();assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'9');
 await page.locator('#lt-discard').click();assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'8');
 await page.locator('[data-lt-number="0:3"]').fill('9');await page.locator('#lt-return').click();await page.locator('#lt-leave-discard').click();assert(await page.locator('#lt-system').isHidden());
 assert.equal(await page.locator('#lifetable tbody tr[data-life-summary] td').nth(1).innerText(),'9');
 assert.deepEqual((await page.evaluate(()=>dashboardLifecycleSnapshot())).summary.actual,actuals[0][0]);
 await page.locator('#lt-system-nav').click();await page.locator('[data-lt-number="0:3"]').fill('11');await page.locator('#lt-return').click();await page.locator('#lt-leave-save').click();
 assert.equal(await page.locator('#lifetable tbody tr[data-life-summary] td').nth(1).innerText(),'10');
 await page.locator('#lt-system-nav').click();await page.locator('[data-lt-number="0:3"]').fill('12');
 await page.goBack();await page.locator('#lt-stay').click();assert(await page.locator('#lt-system').isVisible());assert.equal(await page.locator('[data-lt-number="0:3"]').inputValue(),'12');
 await page.locator('#lt-discard').click();
 for(const width of [1920,1280,600]){
  await page.setViewportSize({width,height:1080});assert(await page.locator('#lt-system').evaluate(e=>e.scrollWidth<=innerWidth+1),'系统页不横向溢出');
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-target-quarter.png',import.meta.url))});
 await page.locator('[data-lt-view="month"]').click();await page.screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-target-month.png',import.meta.url))});
 await page.locator('[data-lt-view="annual"]').click();await page.screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-target-annual.png',import.meta.url))});
 // 工作台菜单切换后可再次进入目标页，返回始终落到总看板。
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'产品中心',exact:true}).click();assert(await page.locator('#lt-system').isHidden());assert(await page.locator('#department-view').isVisible());
 await page.locator('#lt-system-nav').click();await page.goBack();assert(await page.locator('#department-view').isVisible());assert(await page.locator('#lt-system').isHidden());await page.locator('#lt-system-nav').click();await page.locator('#lt-return').click();assert(await page.locator('#department-view').isHidden());assert(await page.locator('main.page').isVisible());
 // 月、季、年看板都读取同一配置，所有计划的实际数继续来自原完成台账。
 for(const mode of ['month','quarter','year']){
  await page.locator(`#time-lifecycle [data-time-mode="${mode}"]`).click();
  for(let stage=0;stage<8;stage++){
   await page.locator('#lifecards .lifecard').nth(stage).click();
   const snapshot=await audit(),data=snapshot.dashboard[stage],cells=page.locator('#lifetable [data-life-summary] td');
   assert.equal(await cells.nth(2).locator('button').evaluate(e=>e.firstChild.textContent.trim()),data.actual.toLocaleString('zh-CN'));
   assert.deepEqual([data.actual,data.yearActual],snapshot.legacyActuals[stage]);
   if(data.targetMeta.state==='complete')assert.equal(await cells.nth(1).innerText(),data.target.toLocaleString('zh-CN'));
   else{assert.match(await cells.nth(1).innerText(),new RegExp(data.targetMeta.label));assert.equal(await cells.nth(3).innerText(),'—')}
  }
 }
 await page.evaluate(()=>localStorage.removeItem('lifecycle-quarter-targets-v1'));await page.reload();
}
