import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function lossModel(){
 const ctx=vm.createContext({boundedCache:()=>({}),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:n=>String(n),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),DATA_CUTOFF:'2026-10-10',
  qrPlatforms:['抖音','快手'],upChannels:p=>p==='all'?['抖音','快手']:Array.isArray(p)?p:[p],qrbTarget:(_p,platform)=>platform==='抖音'?6:10,upSummary:(_p,_s,_e,platform)=>({sales:platform==='抖音'?100:300}),
  pfIdentity:()=>({attribute:'冬季品',isNew:true})});
 for(const file of ['risk-presentation/01-quality.js','product-filters/00-net-estimate.js','risk-presentation/01-loss.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpLossStock=()=>({totalUnits:100,goodsValueCents:500000});
 const current={gsvCents:100000,profitCents:-10000,profitRate:-10,sales:100,returned:20,returnRate:20,receivedRate:6};
 const previous={...current,gsvCents:80000,profitCents:-16000,profitRate:-20,sales:80,returned:10};
 const fields=Object.fromEntries(ctx.rpLossFields({spuId:'fixture',metricPlatform:'all'},current,previous).map(f=>[f.key,f]));
 assert.equal(fields.margin.sortValue,-20);assert.equal(fields.margin.target,'环比 ↑ 33.3%');assert.equal(fields.margin.targetTone,'rp-quality-green');
 assert.equal(ctx.rpLossMarginComparison(-10,-10).target,'环比 持平');
 assert.equal(ctx.rpLossMarginComparison(0,0).target,'环比 持平');
 assert.equal(ctx.rpLossMarginComparison(10,null).target,'环比 --');
 assert.equal(fields.loss.sortValue,-20000);assert.equal(fields.loss.target,'亏损率 20.0%');assert.equal(fields.loss.targetTone,'rp-quality-red');
 assert.equal(fields.netSales.sortValue,80);assert.equal(fields.total.sortValue,100);assert.equal(fields.value.sortValue,500000);
 assert.equal(ctx.rpLossReturnTarget({},'all','',''),9);assert.equal(ctx.rpLossReturnTarget({},'抖音','',''),6);
 assert.equal(fields.return.target,'偏差 +11.0%');assert.equal(fields.received.target,'偏差 -2.0%');assert.equal(fields.received.tone,'rp-quality-normal');
 for(const [now,before,tone] of [[-9.99,-10,'green'],[-10,-10,'gray'],[-11,-10,'gray'],[-11.01,-10,'red'],[-9,-10,'green'],[-8,-10,'green'],[-12,-10,'red'],[1,0,'gray'],[null,10,'gray']])assert.equal(ctx.rpLossMarginComparison(now,before).targetTone,'rp-quality-'+tone);
 ctx.upSummary=()=>({sales:0});assert.equal(ctx.rpLossReturnTarget({},'all','',''),null);
 const empty=Object.fromEntries(ctx.rpLossFields({spuId:'fixture'}, {...current,gsvCents:0,profitCents:0},previous).map(f=>[f.key,f]));assert.equal(empty.margin.value,'—');assert.equal(empty.loss.target,'亏损率 —');
}
export async function lossPreview(page){
 lossModel();
 const card=page.locator('#riskrail .rp-loss-card');
 assert.equal(await card.locator('.rp-loss-entry').count(),6);
 assert.deepEqual(await card.locator('.rp-loss-entry').first().locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),['gsv','margin','loss','return','total']);
 for(const width of [1440,390,1920]){await page.setViewportSize({width,height:1080});assert.equal(await card.locator('.rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'亏损卡片溢出 '+width)}
 assert.equal(await card.locator('[data-rp-loss-margin] .metric-help').count(),0,'榜单指标说明统一放在标题问号中');
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/loss-card-v2.png',import.meta.url))});
 await card.locator('[data-risk="2"]').click();
 const table=page.locator('.rp-loss-table');
 assert.equal(await table.locator('th').count(),17);
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert.deepEqual((await table.locator('th').allTextContents()).slice(-5,-2),['类目','季品','属性']);
 for(const key of ['gsv','margin','loss','return','total']){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.equal(await card.locator('.rp-loss-entry').first().locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
 }
 const trend=page.locator('[data-rp-trend]');assert.deepEqual(await trend.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),['gsv','netSales','margin','return','received']);
 for(const key of ['gsv','netSales','margin','return','received']){await trend.selectOption(key);assert.equal(await table.locator('tbody tr').first().locator('[data-rp-trend-point]').count(),7)}
 const widths=await table.locator('th:has([data-rp-sort])').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));assert(widths.every(w=>w>=127));
 await trend.selectOption('gsv');await page.screenshot({path:fileURLToPath(new URL('../../outputs/loss-drawer-v2.png',import.meta.url))});
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/loss-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
}
