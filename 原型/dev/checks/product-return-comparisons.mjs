import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rate=f=>f.sales>0?(f.returned-f.received)/f.sales*100:null;
const change=(now,before)=>{
 if(!Number.isFinite(now)||!Number.isFinite(before))return '环比 —';
 const delta=now-before,n=Math.round(Math.abs(delta)*10)/10;
 return n===0?'环比 持平':'环比 '+(delta>0?'+':'-')+n.toFixed(1)+'%';
};
export async function productReturnComparisons(page){
 await page.clock.setFixedTime(new Date('2026-10-31T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('a[href="#matrix"]').click();
 const key=await page.evaluate(()=>dashboardKeyProductsSnapshot());
 assert.equal(key.period.mode,'day','保留近30天默认，不改为本月');
 assert.equal(key.period.start,'2026-10-02');
 const rows=page.locator('#matrixtable tbody tr');
 for(let i=0;i<Math.min(await rows.count(),key.visible.length);i++){
  const p=key.visible[i];
  for(const [metric,actual,target] of [['returns',p.facts.returnRate,p.returnTarget],['received',p.facts.receivedRate,p.receivedTarget]]){
   const cell=rows.nth(i).locator('[data-kpm-metric="'+metric+'"]');
   assert.doesNotMatch(await cell.innerText(),/环比/);
   if(Number.isFinite(actual)&&Number.isFinite(target)){
    const delta=actual-target,rounded=Math.abs(delta)<1e-10?0:delta;
    assert.equal(await cell.locator('em').innerText(),'偏差 '+(rounded>0?'+':'')+rounded.toFixed(1)+'%');
   }else assert.equal(await cell.locator('em').count(),0,'缺失目标不编造偏差');
  }
  assert.equal(await rows.nth(i).locator('[data-kpm-metric="unreceived"] em').innerText(),change(rate(p.facts),rate(p.previous)));
 }
 await rows.first().locator('[data-kpm-detail]').click();
 await page.locator('.up-detail [data-drawer-tab="quality"]').click();
 for(const platform of ['抖音','京东']){
  await page.locator('.up-detail [data-up-quality-platform="'+platform+'"]').click();
  const card=page.locator('.up-return-metrics [data-up-quality-metric="unreceived"]');
  assert.match(await card.locator('.up-quality-comparison').innerText(),/^环比 (?:[+-]\d+(?:,\d{3})*\.\d%|持平|—)$/,'平台切换后仍显示有符号差值');
  assert.equal(await card.locator('[data-up-goal]').count(),0,'未收退只增加环比，不增加目标');
 }
 await page.locator('#close').click();
 await page.locator('a[href="#new"]').click();
 for(const preset of ['30','7']){
  await page.locator('#product-date-trigger-new').click();
  await page.locator('#product-date-popover [data-range-preset="'+preset+'"]').click();
  const data=await page.evaluate(()=>dashboardNewProductsSnapshot()),table=page.locator('#newtable');
  const index=await table.locator('[data-nsp-sort="unreceived"]').evaluate(e=>e.closest('th').cellIndex);
  const body=table.locator('tbody tr');assert(await body.count()>0,'样例有新品可核对');
  for(let i=0;i<await body.count();i++){
   const p=data.visible[i];assert.equal(await body.nth(i).locator('td').nth(index).locator('em').innerText(),change(rate(p.current),rate(p.previous)),'新品未收退随经营日期重算');
  }
 }
 const context=vm.createContext({qrbRateDelta:(now,before)=>Number.isFinite(now)&&Number.isFinite(before)?now-before:null,fmt:(n,d=0)=>n.toFixed(d)});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),context);
 const boundary=[[20,15],[0,3],[1,1],[null,0]].map(([now,before])=>{const f=context.rpRateDeltaComparison(now,before);return {text:f.target,tone:f.targetTone}});
 assert.deepEqual(boundary.map(f=>f.text),['环比 +5.0%','环比 -3.0%','环比 持平','环比 —']);
 assert.deepEqual(boundary.map(f=>f.tone),['rp-quality-red','rp-quality-green','rp-quality-gray','rp-quality-gray']);
 console.log('通过：关键产品目标偏差、详情及新品未收退环比、平台/日期切换及正负/持平/缺失。');
}
