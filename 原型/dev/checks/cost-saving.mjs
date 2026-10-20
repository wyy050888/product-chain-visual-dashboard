import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function verifyCostSaving(page,list){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-control/04-opportunity-model.js',import.meta.url),'utf8').replace('window.costSavingAudit=','costSavingAudit='),sandbox);
 const calc=sandbox.ccEstimateUnitSaving,quote=(sku,currentCents,proposedCents,applicableUnits)=>({sku,currentCents,proposedCents,applicableUnits});
 assert.equal(calc([quote('A',10000,9600,100)]),400);
 assert.equal(calc([quote('A',10000,9000,10),quote('B',20000,16000,30)]),3250);
 assert.equal(calc([quote('A',10000,12000,10),quote('B',20000,14000,10)]),2000,'单项涨价须抵扣，不能逐项截零高估');
 assert.equal(calc([quote('A',10000,11000,10)]),0);assert.equal(calc([quote('A',10000,10000,10)]),0);
 assert.equal(calc([]),null);assert.equal(calc([quote('A',10000,null,10)]),null);assert.equal(calc([quote('A',10000,9000,0)]),null);assert.equal(calc([quote('A',10000,9000,1.5)]),null);
 assert.equal(calc([quote('A',Number.MAX_SAFE_INTEGER,0,2)]),null);
 const audit=await page.evaluate(()=>window.costSavingAudit());assert(audit.length>0);assert(new Set(audit.map(row=>row.unitCents)).size>1,'采用各产品关联报价而非固定值');
 for(const row of audit){const qty=row.quotes.reduce((n,q)=>n+q.applicableUnits,0),delta=row.quotes.reduce((n,q)=>n+(q.currentCents-q.proposedCents)*q.applicableUnits,0);assert.equal(row.unitCents,row.quotes.length?Math.max(0,Math.round(delta/qty)):null)}
 for(const row of await list.locator('[data-cc-spu]').all()){
  const id=await row.getAttribute('data-cc-spu'),value=audit.find(r=>r.spuId===id).unitCents;
  assert.match(await row.locator('td:nth-child(2)').innerText(),/\dw$/);assert.equal(await row.locator('td:nth-child(2) small').count(),0);assert.equal(await row.locator('td:nth-child(4)').innerText(),value===null?'—':(value/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'元/台');
  assert.equal(await row.locator('td:nth-child(4) small').count(),0);
  assert.doesNotMatch(await row.locator('.prodname small').innerText(),/ · /,'SPU副标题不附加品牌');
  assert(await row.locator('.cc-gsv-unit').evaluate(unit=>getComputedStyle(unit).color===getComputedStyle(unit.parentElement).color),'w使用正常数值颜色');
 }
 const help=list.locator('[data-cc-saving-help]'),sort=list.locator('[data-rp-sort="unitCents"]');assert.equal(await list.locator('.metric-help').count(),1);
 await help.scrollIntoViewIfNeeded();await help.hover();const tip=page.locator('#metric-tooltip');await tip.waitFor({state:'visible'});assert.match(await tip.getAttribute('class'),/metric-tooltip-cost-saving/);assert.match(await tip.innerText(),/现行单价 − 方案单价/);assert.match(await tip.innerText(),/适用数量/);assert.match(await tip.innerText(),/一次性费用/);assert.doesNotMatch(await tip.innerText(),/缺少可比报价|显示[“]?—/);
 const before=await sort.getAttribute('data-direction');await help.click();assert.equal(await sort.getAttribute('data-direction'),before,'说明按钮不得触发排序');await page.keyboard.press('Escape');assert(await tip.isHidden());assert(await list.isVisible(),'Esc只关闭说明');
 await help.focus();await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 await sort.click();let values=await list.locator('[data-cc-saving-cents]').evaluateAll(es=>es.map(e=>e.dataset.ccSavingCents).filter(value=>value!=='').map(Number));assert(values.every((v,i)=>!i||values[i-1]>=v));await sort.click();values=await list.locator('[data-cc-saving-cents]').evaluateAll(es=>es.map(e=>e.dataset.ccSavingCents).filter(value=>value!=='').map(Number));assert(values.every((v,i)=>!i||values[i-1]<=v));await list.locator('[data-rp-sort="gsvCents"]').click();
 await page.setViewportSize({width:390,height:900});await list.locator('[data-cc-saving-help]').scrollIntoViewIfNeeded();await list.locator('[data-cc-saving-help]').click();await tip.waitFor({state:'visible'});assert(await tip.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}));await page.keyboard.press('Escape');await page.setViewportSize({width:1920,height:1080});await list.locator('.cc-opportunity-results').evaluate(e=>e.scrollLeft=0);
 console.log('通过：同口径报价差加权、涨价抵扣、缺失/零值边界、同行单位及说明浮层与排序');
}
