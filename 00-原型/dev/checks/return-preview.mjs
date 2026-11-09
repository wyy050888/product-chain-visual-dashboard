import {businessRuleContext,revealBusinessRule} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function returnModel(){
 const ctx=businessRuleContext({boundedCache:()=>({}),copyFactRecord:(...rows)=>Object.assign({},...rows),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:n=>String(n),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),pfIdentity:()=>({attribute:'冬季品',isNew:true}),
  qrbReturnTargets:()=>({returnTarget:10,receivedTarget:5.5}),qrObservation:()=>({monthly:{target:10,events:[{type:'罚款',amount:100,reasonType:'quality'},{type:'资金冻结',amount:200,reasonType:'quality'},{type:'下架',reasonType:'quality'},{type:'掉权',reasonType:'quality'}]}})});
 for(const file of ['01-quality.js','01-loss.js','01-return.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpQualityEvents=()=>[];
 const now={gsvCents:100000,sales:100,returned:20,profitRate:20,returnRate:10.5,receivedRate:6};
 const prev={...now,gsvCents:100000,sales:80,returned:10,profitRate:10};
 const fields=Object.fromEntries(ctx.rpReturnFields({channel:'抖音'},now,prev).map(f=>[f.key,f]));
 assert.equal(fields.gsv.target,'环比 持平');assert.equal(fields.netSales.sortValue,80);
 assert.equal(fields.margin.sortValue,20);assert.equal(fields.margin.target,'环比 ↑ 100.0%');
 assert.equal(fields.return.tone,'rp-quality-normal');assert.equal(fields.received.targetTone,'rp-quality-yellow');assert.equal(fields.received.target,'偏差 +0.5%');assert.equal(fields.received.value,'6.0%');
 assert.equal(fields.fine.value,'--');assert.equal(fields.fine.sortValue,null);assert.equal(fields.fine.target,'');
 assert.equal(fields.frozen.sortValue,200);assert.equal(fields.frozen.target,'1次');
 assert.equal(fields.offShelf.sortValue,1);assert.equal(fields.offShelf.target,'环比 --');
 assert.equal(fields.productType.tags[0].kind,'new');
 ctx.qrbReturnTargets=()=>({returnTarget:10,receivedTarget:null});assert.equal(ctx.rpReturnFields({channel:'抖音'},now,prev).find(field=>field.key==='received').target,'','缺少独立目标时不套总退目标');
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
 ].map(r=>({shipped:200,returned:0,previousRate:10,previousReceivedRate:8,...r,channel:'拼多多'}));
 const ctx=businessRuleContext({copyFactRecord:(...rows)=>Object.assign({},...rows),rrState:{platform:'all'},filterCatalog:{normalizeChain:()=>null},upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),
  rrAll:()=>cases,upIdentity:r=>r,upProduct:r=>r,upSummary:r=>({gsvCents:10000,sales:r.shipped,returned:r.returned}),
  qrObservation:r=>({monthly:{target:10,fine:6000,offShelf:r.offShelf||0,events:r.events}})});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/product-filters/00-multiselect.js',import.meta.url),'utf8').match(/^function (?:pfSelected|pfIncludes).*$/gm).join('\n'),ctx);
 const source=fs.readFileSync(new URL('../../src/modules/product-filters/03-confirmed-risk.js',import.meta.url),'utf8');
 const quality=fs.readFileSync(new URL('../../src/modules/quality-monthly/01.js',import.meta.url),'utf8');
 vm.runInContext(quality.match(/^function (?:riskRateDelta|riskRateWorsened|qrbReturnDecision).*$/gm).join('\n'),ctx);
 vm.runInContext(source.slice(source.lastIndexOf('rrRows=function(){')),ctx);
 assert.deepEqual(Array.from(ctx.rrRows(),r=>r.id),[6,5]);
 ctx.rrState.platform=['抖音','拼多多'];assert.deepEqual(Array.from(ctx.rrRows(),r=>r.id),[6,5],'多选平台按或取入榜集合');
 ctx.rrState.platform=['抖音','天猫'];assert.equal(ctx.rrRows().length,0,'未选择的平台不进入结果');ctx.rrState.platform='all';
 assert.deepEqual(Array.from(ctx.rrRows(),r=>Array.from(r.risks)),[['已收退环比恶化'],['总退环比恶化']]);
 for(const r of cases)assert.equal(ctx.pfReturnCauses(r).length>0,[5,6].includes(r.id));
 for(const [orders,now,before,supported,expected] of [[99,9,0,true,false],[100,3,0,true,false],[100,3.1,0,true,true],[100,20,25,true,false],[100,10,null,true,false],[100,10,0,false,false]])assert.equal(ctx.qrbReturnDecision(orders,now,before,supported),expected);
 for(const [sales,returned,hit]of [[200,101,false],[200,100,false],[200,99,true],[101,0,true],[100,0,false],[99,0,false],[null,0,false],[200,null,false]]){
  cases[4].shipped=sales;cases[4].returned=returned;
  assert.equal(ctx.rrRows().some(r=>r.id===5),hit,'去退后销量门槛 '+sales+' - '+returned);
 }
 cases[4].shipped=200;cases[4].returned=0;
 for(const [netSales,returnRate,receivedRate,hit]of [[100,14,8,false],[101,14,8,true],[101,10,10.1,true],[100,10,10.1,false],[101,13,10,false],[null,14,8,false]])assert.equal(ctx.pfReturnCauses({netSales,returnRate,receivedRate,previousRate:10,previousReceivedRate:8}).length>0,hit,'双分支销量边界');
 assert.equal(ctx.rrRows()[0].qualityViolation,true,'满足退货条件的产品继续保留处罚依据');
}
export async function returnPreview(page){
 returnModel();returnEligibilityModel();
 await page.locator('#riskrail [data-rp-platform-menu="6"] [data-rp-platform-option="all"]').click();
 await page.locator('#riskrail [data-rp-platform-menu="6"] [data-rp-platform-option="抖音"]').click();
 const audit=await page.evaluate(()=>({returns:window.returnDeteriorationSnapshot(),quality:window.qualityMonthlyAudit()}));
 assert(audit.returns.rows.every(r=>Number.isFinite(r.netSales)&&r.netSales>100),'真实榜单全部满足去退后销量＞100');
 const worsened=(current,previous,threshold)=>Number.isFinite(current)&&Number.isFinite(previous)&&current-previous>threshold+1e-9;
 assert(audit.returns.rows.every(r=>worsened(r.returnRate,r.previousRate,3)||worsened(r.receivedRate,r.previousReceivedRate,2)),'真实榜单接通本期/上期%差');
 assert(audit.quality.every(m=>m.returnHit===(m.current.orders>=100&&worsened(m.current.returnRate,m.previous.returnRate,3))),'最终品质覆盖层使用上期实际总退，不再使用目标加5');
 const ruleSource=fs.readFileSync(new URL('../../src/modules/risk-presentation/02-render.js',import.meta.url),'utf8');
 const rules=businessRuleContext({});vm.runInContext(ruleSource,rules);
 const summary=rules.rpCardRuleSummary(6);assert.doesNotMatch(summary,/下架≥2次|罚款≥5000元|处罚≥2次/);
 const card=page.locator('#riskrail .rp-return-card'),keys=['gsv','netSales','margin','return','received'];
 const rule=await card.locator('.rhead .card-metric-help').getAttribute('data-metric-rule');
 assert.match(rule,/销量＞100件/);assert.match(rule,/去退后销量/);
 assert.equal(await card.locator('.rp-return-entry').count(),6);
 const first=card.locator('.rp-return-entry').first().locator('[data-rp-platform-row="'+audit.returns.platform+'"]');
 assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),['return','received','gsv','netSales']);
 for(const width of [1440,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await card.locator('.rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'退货卡片溢出 '+width);
 }
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/return-card.png',import.meta.url))});
 await card.locator('[data-risk="6"]').click();
 const table=page.locator('.rp-return-table');assert.equal(await table.locator('th').count(),11);
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert(!(await table.locator('th').allTextContents()).some(text=>['类目','季品'].includes(text.trim())));assert(await table.getByText('属性',{exact:true}).count());
 assert.equal(await table.locator('[data-rp-sort="margin"]').count(),1,'完整榜单保留利润率');
 for(const key of keys.filter(key=>key!=='margin')){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
  assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
 }
 for(const key of ['fine','frozen','offShelf'])assert.equal(await table.locator('[data-rp-sort="'+key+'"]').count(),0);
 assert.equal(await table.locator('tbody tr').evaluateAll(rows=>rows.every(r=>r.cells.length===11)),true,'退货榜表头与数据列对齐');
 assert.equal(await table.locator('[data-rp-trend],.rp-mini-trend').count(),0);
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();
 await revealBusinessRule(page,'quality.worsenSales');
 const group=page.locator('[data-brc-result-group="quality-worsening"]'),sales=group.locator('[data-brc-field="quality.worsenSales"]');
 assert.equal(await sales.inputValue(),'100');
 assert.equal(await group.locator('[data-brc-result-join="quality-worsening"]').inputValue(),'all');
 assert.equal(await group.locator('[data-brc-result-join="quality-worsening-rate"]').inputValue(),'any');
 const original=await page.evaluate(()=>businessRuleConfigSnapshot().conditions);
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);assert.equal(await page.locator('#brc-error').innerText(),'')};
 await sales.fill('101');await save();assert.equal((await page.evaluate(()=>businessRuleRuntimeSnapshot())).worsening4.length,0,'保存后立即应用严格销量边界');
 await sales.fill('100');await save();assert.equal((await page.evaluate(()=>businessRuleRuntimeSnapshot())).worsening4.length,1);
 const saved=await page.evaluate(()=>businessRuleConfigSnapshot().conditions);
 for(const key of ['quality.worsenReturn','quality.worsenReceived'])assert.deepEqual(saved[key],original[key],'保存销量不改原退货增长条件');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 assert.equal((await page.evaluate(()=>businessRuleConfigSnapshot())).values['quality.worsenSales'],100,'刷新后销量条件保留');
 console.log('通过：退货恶化净销量99/100/101、双分支门槛、问号说明、后台且/或关系及保存刷新');
}
