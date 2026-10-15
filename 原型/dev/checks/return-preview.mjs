import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function returnModel(){
 const ctx=vm.createContext({boundedCache:()=>({}),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:n=>String(n),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),pfIdentity:()=>({attribute:'冬季品',isNew:true}),
  qrObservation:()=>({monthly:{target:10,events:[{type:'罚款',amount:100,reasonType:'quality'},{type:'资金冻结',amount:200,reasonType:'quality'},{type:'下架',reasonType:'quality'},{type:'掉权',reasonType:'quality'}]}})});
 for(const file of ['01-quality.js','01-loss.js','01-return.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpQualityEvents=()=>[];
 const now={gsvCents:100000,sales:100,returned:20,profitRate:20,returnRate:10.5,receivedRate:6};
 const prev={...now,gsvCents:100000,sales:80,returned:10,profitRate:10};
 const fields=Object.fromEntries(ctx.rpReturnFields({channel:'抖音'},now,prev).map(f=>[f.key,f]));
 assert.equal(fields.gsv.target,'环比 持平');assert.equal(fields.netSales.sortValue,80);
 assert.equal(fields.margin.sortValue,20);assert.equal(fields.margin.target,'环比 ↑ 100.0%');
 assert.equal(fields.return.tone,'rp-quality-red');assert.equal(fields.received.targetTone,'rp-quality-green');
 assert.equal(fields.fine.sortValue,100);assert.equal(fields.fine.target,'1次');
 assert.equal(fields.frozen.sortValue,200);assert.equal(fields.frozen.target,'1次');
 assert.equal(fields.offShelf.sortValue,1);assert.equal(fields.offShelf.target,'环比 --');
 assert.equal(fields.productType.tags[0].kind,'new');
}
export async function returnPreview(page){
 returnModel();
 const card=page.locator('#riskrail .rp-return-card'),keys=['gsv','netSales','margin','return','received'];
 assert.equal(await card.locator('.rp-return-entry').count(),6);
 const first=card.locator('.rp-return-entry').first();
 assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),keys);
 for(const width of [1440,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await card.locator('.rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'退货卡片溢出 '+width);
 }
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/return-card.png',import.meta.url))});
 await card.locator('[data-risk="6"]').click();
 const table=page.locator('.rp-return-table');assert.equal(await table.locator('th').count(),15);
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert.deepEqual((await table.locator('th').allTextContents()).slice(-4,-2),['季品','属性']);
 for(const key of keys){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
  assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
 }
 for(const key of ['fine','frozen']){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
  assert.match(await table.locator('tbody tr').first().locator('td').nth(index).locator('em').innerText(),/^\d+次$/);
 }
 const trend=page.locator('[data-rp-trend]');assert.deepEqual(await trend.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),keys);
 for(const key of keys){await trend.selectOption(key);assert.equal(await table.locator('tbody tr').first().locator('[data-rp-trend-point]').count(),7)}
 await trend.selectOption('gsv');await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer.png',import.meta.url))});
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
}
