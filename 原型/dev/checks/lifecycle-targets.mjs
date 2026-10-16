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
 assert.equal(ctx.ltAggregate([0,0]).state,'missing');assert.equal(ctx.ltAggregate([0,5]).state,'partial');assert.equal(ctx.ltAggregate([3,5]).value,8);
 assert.equal(ctx.ltTargetFor(0,[0,1,2,3,4],{year:2026,mode:'month',value:10}).value,28);
 assert.equal(ctx.ltTargetFor(5,[0,1,2,3,4],{year:2026,mode:'month',value:10}).value,30,'品质整改合计包含新老品');
 assert.equal(ctx.ltTargetFor(6,[0,1,2,3,4],{year:2026,mode:'year',value:1}).value,276);
 assert.equal(ctx.ltTargetFor(0,[0,1,2,3,4],{year:2027,mode:'year',value:1}).state,'missing');
 const grid=vm.runInContext('ltEmptyGrid()',ctx);grid[0][0]=[1,0,0,0];
 assert.equal(ctx.ltTargetFor(0,[0],{year:2026,mode:'quarter',value:1},false,grid).state,'complete','季度已配置时不把月度拆分中的0当作缺失季度');
 assert.equal(ctx.ltTargetFor(0,[0],{year:2026,mode:'month',value:2},false,grid).state,'missing','月份目标0显示未配置');
 grid[0][0]=[9,'none',null,'draft'];
 const legacy=vm.createContext({localStorage:{getItem:()=>JSON.stringify({version:1,years:{2026:{values:grid,revision:2}}})}});vm.runInContext(sources,legacy);
 assert.deepEqual(Array.from(vm.runInContext('ltYearValues(2026)[0][0]',legacy)),[9,0,0,0],'旧数值保留，旧状态转换为未配置0');
 const audit=()=>page.evaluate(()=>lifecycleTargetsAudit());
 const open=()=>page.locator('#lt-system-nav').click();
 const back=async()=>{await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'总看板',exact:true}).click()};
 await page.evaluate(()=>localStorage.removeItem('lifecycle-quarter-targets-v1'));await page.reload();
 const actuals=(await audit()).dashboard.map(d=>[d.actual,d.yearActual]);assert.deepEqual(actuals,(await audit()).legacyActuals);
 assert((await audit()).dashboard.every(d=>d.targetMeta.state==='complete'));
 await page.locator('#lt-open-targets').evaluate(el=>el.click());
 assert.equal(await page.evaluate(()=>location.hash),'#system-lifecycle-targets');assert(await page.locator('main.page').isHidden());
 assert.equal(await page.locator('#lt-system-nav').getAttribute('aria-current'),'page');
 assert.equal(await page.locator('#lt-table tbody tr').count(),9);assert.equal(await page.locator('#lt-table input[type=number]').count(),36);
 assert.equal(await page.locator('#lt-save,#lt-table select,#lt-view,#lt-updated,#lt-dirty,#lt-return,#lt-discard,.lt-breadcrumb,#lt-system h1').count(),0);
 assert.deepEqual(await page.locator('#lt-table thead th').allTextContents(),['计划','Q1','Q2','Q3','Q4','年度目标']);
 const input=page.locator('[data-lt-number="0:3"]');
 assert.equal(await input.inputValue(),'18');assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'72');
 await input.fill('20');
 assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'74');
 assert.equal((await audit()).saved.years[2026].values[0][0][3],20,'输入时即生效，无须失焦或保存');
 assert.equal((await audit()).dashboard[0].target,29);assert(await input.evaluate(e=>e===document.activeElement));
 assert.match(await page.locator('#lifecards .lifecard').first().innerText(),/8 \/ 29/,'隐藏的看板同步刷新');
 for(const invalid of ['-1','1.5','100000']){
  await input.fill(invalid);assert.match(await page.locator('#lt-error').innerText(),/整数/);
  assert.equal((await audit()).saved.years[2026].values[0][0][3],20,'非法输入不能覆盖已生效目标');
 }
 await input.fill('21');assert.equal(await page.locator('#lt-error').innerText(),'');
 await page.locator('[data-lt-category="1"]').click();await page.locator('[data-lt-category="0"]').click();assert.equal(await input.inputValue(),'21');
 await page.locator('#lt-year').selectOption('2027');
 assert.equal(await page.locator('[data-lt-number="0:0"]').inputValue(),'0');
 await page.locator('[data-lt-number="0:0"]').fill('11');assert.equal((await audit()).saved.years[2027].values[0][0][0],11);
 await page.locator('#lt-year').selectOption('2026');assert.equal(await page.locator('[data-lt-number="0:0"]').inputValue(),'17','切换年份不能把上一年输入写入新年份');await input.fill('20');
 await page.evaluate(()=>{window.ltNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lifecycle-quarter-targets-v1')throw Error('blocked');return ltNativeSet.call(this,key,value)}});
 await input.fill('24');assert.match(await page.locator('#lt-error').innerText(),/自动保存失败/);assert.equal((await audit()).saved.years[2026].values[0][0][3],20);assert.equal((await audit()).dashboard[0].target,29);
 await page.evaluate(()=>{Storage.prototype.setItem=window.ltNativeSet;delete window.ltNativeSet});
 await input.fill('24');assert.equal((await audit()).saved.years[2026].values[0][0][3],24);assert.equal((await audit()).dashboard[0].target,30);
 assert.deepEqual((await audit()).dashboard.map(d=>[d.actual,d.yearActual]),actuals);
 await page.reload();assert(await page.locator('#lt-system').isVisible());assert.equal(await input.inputValue(),'24');assert.equal((await audit()).saved.years[2026].values[0][0][0],17);assert.equal((await audit()).saved.years[2027].values[0][0][0],11);
 await input.fill('');assert.equal((await audit()).saved.years[2026].values[0][0][3],0);assert.equal((await audit()).dashboard[0].targetMeta.state,'partial');
 await page.locator('[data-lt-number="0:2"]').focus();assert.equal(await input.inputValue(),'0');
 await back();assert(await page.locator('#lt-system').isHidden());assert(await page.locator('#overlay').isHidden());
 assert.match(await page.locator('#lifecards .lifecard').first().innerText(),/未配置/);
 await open();await input.fill('20');await back();assert(await page.locator('#overlay').isHidden());assert.equal((await audit()).dashboard[0].target,29);
 await open();await input.fill('21');await page.goBack();assert(await page.locator('#lt-system').isHidden());assert(await page.locator('#overlay').isHidden());assert.equal((await audit()).saved.years[2026].values[0][0][3],21);
 await open();
 for(const width of [1920,1280,600]){await page.setViewportSize({width,height:1080});assert(await page.locator('#lt-system').evaluate(e=>e.scrollWidth<=innerWidth+1));assert.equal(await page.locator('#lt-save').count(),0);}
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-target-auto-apply.png',import.meta.url))});
 await back();
 for(const mode of ['month','quarter','year']){await page.locator(`#time-lifecycle [data-time-mode="${mode}"]`).click();for(let stage=0;stage<8;stage++){await page.locator('#lifecards .lifecard').nth(stage).click();const snapshot=await audit(),data=snapshot.dashboard[stage],cells=page.locator('#lifetable [data-life-summary] td');assert.deepEqual([data.actual,data.yearActual],snapshot.legacyActuals[stage]);if(data.targetMeta.state==='complete')assert.equal(await cells.nth(1).innerText(),data.target.toLocaleString('zh-CN'));else{assert.equal(await cells.nth(1).innerText(),'未配置');assert.equal(await cells.nth(3).innerText(),'—')}}}
 await page.evaluate(()=>localStorage.removeItem('lifecycle-quarter-targets-v1'));await page.reload();
}
