import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function lossModel(){
 const ctx=businessRuleContext({boundedCache:()=>({}),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:(n,d=0)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),DATA_CUTOFF:'2026-10-10',
  filterCatalog:{platforms:['抖音','快手']},qrPlatforms:['抖音','快手'],upChannels:p=>p==='all'?['抖音','快手']:Array.isArray(p)?p:[p],qrbTarget:(_p,platform)=>platform==='抖音'?6:10,upSummary:(_p,_s,_e,platform)=>({sales:platform==='抖音'?100:300}),
  qrbReturnTargets:(_p,platform)=>({returnTarget:platform==='抖音'?6:10,receivedTarget:platform==='抖音'?3:5}),pfIdentity:()=>({attribute:'冬季品',isNew:true})});
 for(const file of ['ui-controls/00-stock-quantity.js','risk-presentation/01-quality.js','product-filters/00-net-estimate.js','risk-presentation/01-loss.js','unified-product/05-operating-view.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpLossStock=()=>({totalUnits:100,goodsValueCents:500000,totalCoverage15:12.5});
 const current={gsvCents:100000,profitCents:-10000,profitRate:-10,sales:100,returned:20,returnRate:20,receivedRate:6};
 const previous={...current,gsvCents:80000,profitCents:-16000,profitRate:-20,sales:80,returned:10,receivedRate:4};
 const fields=Object.fromEntries(ctx.rpLossFields({spuId:'fixture',metricPlatform:'all'},current,previous).map(f=>[f.key,f]));
 assert.equal(fields.margin.sortValue,-20);assert.equal(fields.margin.target,'环比 +10.0%');assert.equal(fields.margin.targetTone,'rp-quality-green');
 assert.equal(ctx.rpLossMarginComparison(-10,-10).target,'环比 持平');
 assert.equal(ctx.rpLossMarginComparison(0,0).target,'环比 持平');
 assert.equal(ctx.rpLossMarginComparison(10,null).target,'环比 —');
 assert.equal(fields.loss.sortValue,-20000);assert.equal(fields.loss.target,'环比 ↓ 16.7%');assert.equal(fields.loss.targetTone,'rp-quality-green');
 const worsening=Object.fromEntries(ctx.rpLossFields({spuId:'fixture'}, {...current,profitCents:-30000},previous).map(f=>[f.key,f]));assert.equal(worsening.loss.target,'环比 ↑ 66.7%');assert.equal(worsening.loss.targetTone,'rp-quality-red');
 const profitableBefore=Object.fromEntries(ctx.rpLossFields({spuId:'fixture'},current,{...previous,profitCents:40000}).map(f=>[f.key,f]));assert.equal(profitableBefore.loss.target,'环比 --');
 assert.equal(fields.netSales.sortValue,80);assert.equal(fields.total.sortValue,100);assert.equal(fields.value.sortValue,500000);assert.equal(fields.total.cardTarget,'货值 '+fields.value.value);assert.equal(fields.total.target,fields.total.cardTarget);assert.equal(fields.totalCoverage15.sortValue,12.5);assert.equal(fields.totalCoverage15.value,'12.5天');
 assert.equal(ctx.upReturnTargets({product:{}},{platform:'all',start:'',end:''}).receivedTarget,4.5,'全平台已收退目标按同期销量加权');
 assert.equal(ctx.rpLossReturnTarget({},'all','',''),9);assert.equal(ctx.rpLossReturnTarget({},'抖音','',''),6);
 assert.equal(fields.return.target,'偏差 +11.0%');assert.equal(fields.received.target,'偏差 +1.5%');assert.equal(fields.received.value,'6.0%');assert.equal(fields.return.tone,'rp-quality-red');assert.equal(fields.received.tone,'rp-quality-red');
 const single=Object.fromEntries(ctx.rpLossFields({spuId:'fixture',metricPlatform:'抖音'},current,previous).map(f=>[f.key,f]));
 assert.equal(single.return.target,'偏差 +14.0%');assert.equal(single.received.target,'偏差 +3.0%');assert.equal(single.return.tone,'rp-quality-red');assert.equal(single.received.tone,'rp-quality-red');
 const targetSource=ctx.qrbReturnTargets,totalSource=ctx.qrbTarget;
 ctx.qrbReturnTargets=()=>({returnTarget:null,receivedTarget:null});ctx.qrbTarget=()=>null;
 const missing=Object.fromEntries(ctx.rpLossFields({spuId:'fixture',metricPlatform:'all'},current,previous).map(f=>[f.key,f]));
 assert.equal(missing.return.target,'');assert.equal(missing.received.target,'','缺失目标不使用环比或推算目标替代');
 ctx.qrbReturnTargets=targetSource;ctx.qrbTarget=totalSource;
 const subset=Object.fromEntries(ctx.rpLossFields({spuId:'fixture',metricPlatform:['抖音','快手']},current,previous).map(f=>[f.key,f]));
 assert.equal(subset.return.target,'偏差 +11.0%');assert.equal(subset.received.target,'偏差 +1.5%');
 for(const [now,before,tone] of [[-9.99,-10,'gray'],[-10,-10,'gray'],[-11,-10,'gray'],[-11.01,-10,'red'],[-9,-10,'gray'],[-8,-10,'green'],[-12,-10,'red'],[1,0,'gray'],[null,10,'gray']])assert.equal(ctx.rpLossMarginComparison(now,before).targetTone,'rp-quality-'+tone);
 // 净利润率取百分点差，0.0%按显示精度归持平；上期为0仍可比较。
 for(const [now,before,tone] of [[-9.99,-10,'gray'],[-10.01,-10,'gray'],[-9.9,-10,'green'],[-10.1,-10,'red'],[-9,-10,'green'],[-11,-10,'red'],[10.1,10,'green'],[9.9,10,'red'],[-10,-10,'gray'],[0,0,'gray'],[1,0,'green'],[null,10,'gray']])assert.equal(ctx.rpNetMarginComparison(now,before).targetTone,'rp-quality-'+tone,'净利润率无10%灰色区间');
 for(const [net,tone] of [[-10100,'red'],[-10000,'gray'],[-9900,'green']]){
  const actual={...current,gsvCents:100000,profitCents:10000+net},prior={...current,gsvCents:100000,profitCents:0};
  const margin=ctx.rpLossFields({spuId:'fixture',metricPlatform:'all'},actual,prior).find(f=>f.key==='margin');
  assert(Math.abs(margin.sortValue-net/1000)<1e-10);assert.equal(margin.targetTone,'rp-quality-'+tone);
  assert.match(margin.hint,/不设10%灰色区间/);
  if(net!==-10000)assert.match(margin.target,net>-10000?/\+/:/-/);
 }
 // 亏损不设10%灰色区间，普通经营环比仍保留；验证箭头、颜色和负数主值。
 for(const [amount,tone] of [[8900,'green'],[9000,'green'],[9500,'green'],[9990,'green'],[10000,'gray'],[10010,'red'],[10500,'red'],[11000,'red'],[11100,'red']]){
  const facts={...current,gsvCents:100000,profitCents:10000-amount},prior={...current,gsvCents:100000,profitCents:0};
  const loss=ctx.rpLossFields({spuId:'fixture',metricPlatform:'all'},facts,prior).find(f=>f.key==='loss');
  assert.equal(loss.sortValue,-amount,'亏损主值保留负数');assert.equal(loss.targetTone,'rp-quality-'+tone,'亏损绝对值 '+amount+'/10000');
  if(amount!==10000)assert.match(loss.target,amount>10000?/↑/:/↓/,'减亏向下、增亏向上');else assert.equal(loss.target,'环比 持平');
  assert.match(loss.hint,/涨红降绿/);assert.match(loss.hint,/不设10%灰色区间/);
 }
 for(const [now,before] of [[null,-100],[-100,null],[-100,0],[0,0],[-100,-100]])assert.equal(ctx.rpLossAmountComparison(now,before).targetTone,'rp-quality-gray','亏损持平或无可比数据');
 ctx.upSummary=()=>({sales:0});assert.equal(ctx.rpLossReturnTarget({},'all','',''),null);
 const empty=Object.fromEntries(ctx.rpLossFields({spuId:'fixture'}, {...current,gsvCents:0,profitCents:0},previous).map(f=>[f.key,f]));assert.equal(empty.margin.value,'—');assert.equal(empty.loss.target,'环比 --');
}
export async function lossPreview(page){
 lossModel();
 const text=async locator=>(await locator.innerText()).replace(/\s+/g,'');
 const card=page.locator('#riskrail .rp-loss-card');
 assert.equal(await card.locator('.rp-loss-entry').count(),6);
 assert.deepEqual(await card.locator('.rp-loss-entry').first().locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),['loss','margin','gsv','return','received','total']);
 for(const width of [1440,390,1920]){await page.setViewportSize({width,height:1080});assert.equal(await card.locator('.rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'亏损卡片溢出 '+width)}
 const spacing=await card.locator('.rp-loss-entry').evaluateAll(rows=>rows.map(row=>{
  const rect=e=>e.getBoundingClientRect(),metric=row.querySelector('[data-rp-field=loss]'),main=rect(metric.querySelector('strong')),tag=rect(metric.querySelector('.number-signal')),comparison=rect(metric.querySelector('small')),body=rect(row.querySelector('.rp-entry-main')),bounds=rect(row);
  return {gap:comparison.top-tag.bottom,tagHeight:tag.height,contained:tag.top>=main.top&&tag.bottom<=main.bottom,centerOffset:Math.abs((body.top+body.bottom)/2-(bounds.top+bounds.bottom)/2)};
 }));
 assert(spacing.every(row=>row.contained&&row.tagHeight<=22&&row.gap>=6&&row.centerOffset<=1),'金额标签不侵入环比，两行整体居中');
 assert.equal(await card.locator('[data-rp-loss-margin] .metric-help').count(),0,'榜单指标说明统一放在标题问号中');
 assert((await card.locator('[data-rp-field=total] small').allTextContents()).every(text=>text.startsWith('货值 ')));
 assert.equal(await card.locator('.rp-loss-toolbar>.rp-quality-actions [data-risk="2"]').count(),1,'查看全部保留在工具栏右侧');
 assert.equal(await card.locator('.rhead [data-risk="2"]').count(),0);
 const appearance=await card.evaluate(root=>({name:getComputedStyle(root.querySelector('.rp-identity b')).fontSize,header:getComputedStyle(root.querySelector('.rp-loss-columns>span')).fontSize,ranks:[...root.querySelectorAll('.rank')].map(rank=>({color:getComputedStyle(rank).color,decoration:getComputedStyle(rank,'::before').display}))}));
 assert.equal(appearance.name,'14px');assert.equal(appearance.header,'14px');assert(appearance.ranks.every(rank=>rank.color!=='rgb(255, 255, 255)'&&rank.decoration==='none'),'普通表格序号清晰且无盾牌背景');
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/loss-card-v2.png',import.meta.url))});
 await card.locator('[data-risk="2"]').click();
 const table=page.locator('.rp-loss-table');
 assert.equal(await table.locator('th').count(),12);
 const inventoryColumn=await table.locator('[data-rp-sort=total]').evaluate(node=>node.closest('th').cellIndex);
 const daysColumn=await table.locator('[data-rp-sort=totalCoverage15]').evaluate(node=>node.closest('th').cellIndex);assert.equal(daysColumn,inventoryColumn+1);
 assert(!(await table.locator('th').allTextContents()).some(text=>text.includes('货值（总库存）')));
 assert.equal(await text(table.locator('tbody tr').first().locator('td').nth(inventoryColumn).locator('em')),await text(card.locator('[data-rp-field=total] small').first()));
 assert.match(await table.locator('tbody tr').first().locator('td').nth(daysColumn).locator('strong').innerText(),/天$/);
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert(!(await table.locator('th').allTextContents()).some(text=>['类目','季品'].includes(text.trim())));assert(await table.getByText('属性',{exact:true}).count());
 for(const key of ['gsv','margin','loss','return','received','total']){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.equal(await text(card.locator('.rp-loss-entry').first().locator('[data-rp-field="'+key+'"] strong')),await text(table.locator('tbody tr').first().locator('td').nth(index).locator('strong')));
  if(key==='loss'){const comparison=await text(card.locator('.rp-loss-entry [data-rp-field="loss"] small').first());assert.match(comparison,/^环比/);assert.equal(comparison,await text(table.locator('tbody tr').first().locator('td').nth(index).locator('em')));}
 }
 assert.equal(await table.locator('[data-rp-trend],.rp-mini-trend').count(),0);
 const widths=await table.locator('th:has([data-rp-sort])').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));assert(widths.every(w=>w>=127));
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/loss-drawer-v2.png',import.meta.url))});
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/loss-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
 // 首页和抽屉随同一平台粒度切换第二行；分别核对总退与已收退。
 for(const platform of ['抖音','快手','视频号','天猫','京东','拼多多','all']){
  await card.locator('[data-rp-platform-option="'+platform+'"]').click();
  const label='偏差';
  for(const key of ['return','received']){
   const values=await card.locator('[data-rp-field="'+key+'"] small').allTextContents();
   assert(values.length>0&&values.every(value=>value.startsWith(label)),platform+' 首页 '+key+' 第二行');
  }
  await card.locator('[data-risk="2"]').click();
  for(const key of ['return','received']){
   const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
   const values=await table.locator('tbody tr').locator('td:nth-child('+(index+1)+') em').allTextContents();
   assert(values.length>0&&values.every(value=>value.startsWith(label)),platform+' 抽屉 '+key+' 第二行');
  }
  await page.locator('#close').click();
 }

}
