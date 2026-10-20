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
 assert.equal(fields.fine.value,'--');assert.equal(fields.fine.sortValue,null);assert.equal(fields.fine.target,'');
 assert.equal(fields.frozen.sortValue,200);assert.equal(fields.frozen.target,'1次');
 assert.equal(fields.offShelf.sortValue,1);assert.equal(fields.offShelf.target,'环比 --');
 assert.equal(fields.productType.tags[0].kind,'new');
}
// 处罚本身不触发恶化榜；两项退货条件及已入榜产品的处罚展示/排序保持原逻辑。
function returnEligibilityModel(){
 const cases=[
  {id:1,returnRate:10,receivedRate:8,events:[{type:'下架'},{type:'下架'}],offShelf:2},
  {id:2,returnRate:10,receivedRate:8,events:[{type:'罚款',amount:5000}]},
  {id:3,returnRate:10,receivedRate:8,previousRate:7,previousReceivedRate:6,events:[]},
  {id:4,returnRate:20,receivedRate:15,previousRate:25,previousReceivedRate:20,events:[{type:'罚款',amount:9000}]},
  {id:5,returnRate:3.1,receivedRate:8,previousRate:0,events:[]},
  {id:6,returnRate:10,receivedRate:2.1,previousReceivedRate:0,events:[{type:'罚款',amount:6000},{type:'下架'}]},
  {id:7,returnRate:null,receivedRate:null,previousRate:0,previousReceivedRate:0,events:[{type:'罚款',amount:9000}]},
  {id:8,returnRate:10,receivedRate:8,previousRate:null,previousReceivedRate:null,events:[]},
  {id:9,returnRate:7.1,receivedRate:2.1,previousRate:4.1,previousReceivedRate:.1,events:[]}
 ].map(r=>({previousRate:10,previousReceivedRate:8,...r,channel:'拼多多'}));
 const ctx=vm.createContext({rrState:{platform:'all'},upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),
  rrAll:()=>cases,upIdentity:r=>r,upProduct:r=>r,upSummary:()=>({gsvCents:10000}),
  qrObservation:r=>({monthly:{target:10,fine:6000,offShelf:r.offShelf||0,events:r.events}})});
 const source=fs.readFileSync(new URL('../../src/modules/product-filters/03-confirmed-risk.js',import.meta.url),'utf8');
 const quality=fs.readFileSync(new URL('../../src/modules/quality-monthly/01.js',import.meta.url),'utf8');
 vm.runInContext(quality.match(/^function (?:riskRateDelta|riskRateWorsened|qrbReturnDecision).*$/gm).join('\n'),ctx);
 vm.runInContext(source.slice(source.lastIndexOf('rrRows=function(){')),ctx);
 assert.deepEqual(Array.from(ctx.rrRows(),r=>r.id),[6,5]);
 assert.deepEqual(Array.from(ctx.rrRows(),r=>Array.from(r.risks)),[['已收退环比恶化'],['总退环比恶化']]);
 for(const r of cases)assert.equal(ctx.pfReturnCauses(r).length>0,[5,6].includes(r.id));
 for(const [orders,now,before,supported,expected] of [[99,9,0,true,false],[100,3,0,true,false],[100,3.1,0,true,true],[100,20,25,true,false],[100,10,null,true,false],[100,10,0,false,false]])assert.equal(ctx.qrbReturnDecision(orders,now,before,supported),expected);
 assert.equal(ctx.rrRows()[0].qualityViolation,true,'满足退货条件的产品继续保留处罚依据');
}
export async function returnPreview(page){
 returnModel();returnEligibilityModel();
 const audit=await page.evaluate(()=>({returns:window.returnDeteriorationSnapshot(),quality:window.qualityMonthlyAudit()}));
 const worsened=(current,previous,threshold)=>Number.isFinite(current)&&Number.isFinite(previous)&&current-previous>threshold+1e-9;
 assert(audit.returns.rows.every(r=>worsened(r.returnRate,r.previousRate,3)||worsened(r.receivedRate,r.previousReceivedRate,2)),'真实榜单接通本期/上期百分点差');
 assert(audit.quality.every(m=>m.returnHit===(m.current.orders>=100&&worsened(m.current.returnRate,m.previous.returnRate,3))),'最终品质覆盖层使用上期实际总退，不再使用目标加5');
 const ruleSource=fs.readFileSync(new URL('../../src/modules/risk-presentation/02-render.js',import.meta.url),'utf8');
 const rules=vm.createContext({});vm.runInContext(ruleSource,rules);
 const summary=rules.rpCardRuleSummary(6);assert.doesNotMatch(summary,/下架≥2次|罚款≥5000元|处罚≥2次/);
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
 const table=page.locator('.rp-return-table');assert.equal(await table.locator('th').count(),14);
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert.deepEqual((await table.locator('th').allTextContents()).slice(-5,-2),['类目','季品','属性']);
 for(const key of keys){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
  assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
 }
 for(const key of ['fine','frozen','offShelf'])assert.equal(await table.locator('[data-rp-sort="'+key+'"]').count(),0);
 assert.equal(await table.locator('tbody tr').evaluateAll(rows=>rows.every(r=>r.cells.length===14)),true,'退货榜表头与数据列对齐');
 const trend=page.locator('[data-rp-trend]');assert.deepEqual(await trend.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),keys);
 for(const key of keys){await trend.selectOption(key);assert.equal(await table.locator('tbody tr').first().locator('[data-rp-trend-point]').count(),7)}
 await trend.selectOption('gsv');await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer.png',import.meta.url))});
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
}
