import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function returnModel(){
 const ctx=businessRuleContext({boundedCache:()=>({}),copyFactRecord:(...rows)=>Object.assign({},...rows),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:(n,d=0)=>Number(n).toFixed(d),upUnreceivedRate:s=>s.returnRate-s.receivedRate,upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),pfIdentity:()=>({attribute:'冬季品',isNew:true}),
  qrbReturnTargets:()=>({returnTarget:10,receivedTarget:5.5}),qrObservation:()=>({monthly:{target:10,events:[{type:'罚款',amount:100,reasonType:'quality'},{type:'资金冻结',amount:200,reasonType:'quality'},{type:'下架',reasonType:'quality'},{type:'掉权',reasonType:'quality'}]}})});
 for(const file of ['01-quality.js','01-loss.js','01-return.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpQualityEvents=()=>[];
 const now={gsvCents:100000,sales:100,returned:20,profitRate:20,returnRate:10.5,receivedRate:6};
 const prev={...now,gsvCents:100000,sales:80,returned:10,profitRate:10,returnRate:10,receivedRate:5.5};
 const fields=Object.fromEntries(ctx.rpReturnFields({channel:'抖音'},now,prev).map(f=>[f.key,f]));
 assert.equal(fields.gsv.target,'环比 持平');assert.equal(fields.netSales.sortValue,80);
 assert.equal(fields.margin.sortValue,20);assert.equal(fields.margin.target,'环比 ↑ 100.0%');
 for(const [key,growth,actual,tone] of [['return','↑ 5.0%','10.5%','red'],['received','↑ 9.1%','6.0%','red'],['unreceived','持平','4.5%','gray']]){
  const column=fields[key+'Growth'];
  assert.equal(column.value,growth);assert.equal(column.target,'实际 '+actual);assert.equal(column.tone,'rp-quality-'+tone);
  assert.equal(fields[key].target,'环比 '+growth);
 }
 assert.equal(fields.fine.value,'--');assert.equal(fields.fine.sortValue,null);assert.equal(fields.fine.target,'');
 assert.equal(fields.frozen.sortValue,200);assert.equal(fields.frozen.target,'1次');
 assert.equal(fields.offShelf.sortValue,1);assert.equal(fields.offShelf.target,'环比 +1次');
 assert.equal(fields.productType.tags[0].kind,'new');
 const zeroBase=ctx.rpReturnFields({channel:'抖音'},now,{...prev,returnRate:0,receivedRate:0}).find(field=>field.key==='unreceivedGrowth');
 assert.equal(zeroBase.value,'—');assert.equal(zeroBase.sortValue,null);assert.equal(zeroBase.target,'实际 4.5%');
}
// 处罚本身不触发恶化榜；两项退货条件及已入榜产品的处罚展示/排序保持原逻辑。
function returnEligibilityModel(){
 const cases=[
  {id:1,returnRate:10,receivedRate:8,events:[{type:'下架'},{type:'下架'}],offShelf:2},
  {id:2,returnRate:10,receivedRate:8,events:[{type:'罚款',amount:5000}]},
  {id:3,returnRate:11,receivedRate:8.8,events:[]},
  {id:4,returnRate:20,receivedRate:15,previousRate:25,previousReceivedRate:20,events:[{type:'罚款',amount:9000}]},
  {id:5,returnRate:11.01,receivedRate:8,events:[]},
  {id:6,returnRate:10,receivedRate:9,events:[{type:'罚款',amount:6000},{type:'下架'}]},
  {id:7,returnRate:null,receivedRate:null,previousRate:0,previousReceivedRate:0,events:[{type:'罚款',amount:9000}]},
  {id:8,returnRate:10,receivedRate:8,previousRate:null,previousReceivedRate:null,events:[]},
  {id:9,returnRate:11.01,receivedRate:8.81,previousRate:0,previousReceivedRate:0,events:[]}
 ].map(r=>({shipped:200,returned:0,previousRate:10,previousReceivedRate:8,...r,channel:'拼多多'}));
 const ctx=businessRuleContext({copyFactRecord:(...rows)=>Object.assign({},...rows),rrState:{platform:'all'},filterCatalog:{normalizeChain:()=>null},upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),
  rrAll:()=>cases,rpRankReturnRows:rows=>rows,upIdentity:r=>r,upProduct:r=>r,upSummary:r=>({gsvCents:10000,sales:r.shipped,returned:r.returned}),
  qrObservation:r=>({monthly:{target:10,fine:6000,offShelf:r.offShelf||0,events:r.events}})});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/product-filters/00-multiselect.js',import.meta.url),'utf8').match(/^function (?:pfSelected|pfIncludes).*$/gm).join('\n'),ctx);
 const source=fs.readFileSync(new URL('../../src/modules/product-filters/03-confirmed-risk.js',import.meta.url),'utf8');
 const quality=fs.readFileSync(new URL('../../src/modules/quality-monthly/01.js',import.meta.url),'utf8');
 vm.runInContext(quality.match(/^function qrbReturnDecision.*$/m)[0],ctx);
 vm.runInContext(source.slice(source.lastIndexOf('rrRows=function(){')),ctx);
 assert.deepEqual(Array.from(ctx.rrRows(),r=>r.id),[5,6]);
 ctx.rrState.platform=['抖音','拼多多'];assert.deepEqual(Array.from(ctx.rrRows(),r=>r.id),[5,6],'多选平台按或取入榜集合');
 ctx.rrState.platform=['抖音','天猫'];assert.equal(ctx.rrRows().length,0,'未选择的平台不进入结果');ctx.rrState.platform='all';
 assert.deepEqual(Array.from(ctx.rrRows(),r=>Array.from(r.risks)),[['总退环比恶化'],['已收退环比恶化']]);
 for(const r of cases)assert.equal(ctx.pfReturnCauses(r).length>0,[5,6].includes(r.id));
 for(const [orders,now,before,supported,expected] of [[99,11,10,true,false],[100,10.3,10,true,false],[100,10.31,10,true,true],[100,20,25,true,false],[100,10,null,true,false],[100,10,0,true,false],[100,11,10,false,false]])assert.equal(ctx.qrbReturnDecision(orders,now,before,supported),expected);
 for(const [sales,returned,hit]of [[200,101,false],[200,100,false],[200,99,true],[101,0,true],[100,0,false],[99,0,false],[null,0,false],[200,null,false]]){
  cases[4].shipped=sales;cases[4].returned=returned;
  assert.equal(ctx.rrRows().some(r=>r.id===5),hit,'去退后销量门槛 '+sales+' - '+returned);
 }
 cases[4].shipped=200;cases[4].returned=0;
 for(const [netSales,returnRate,receivedRate,hit]of [[100,14,8,false],[101,14,8,true],[101,10,10.1,true],[100,10,10.1,false],[101,11,8.8,false],[null,14,8,false]])assert.equal(ctx.pfReturnCauses({netSales,returnRate,receivedRate,previousRate:10,previousReceivedRate:8}).length>0,hit,'双分支销量边界');
 assert.equal(ctx.rrRows().find(r=>r.id===6).qualityViolation,true,'满足退货条件的产品继续保留处罚依据');
}
export async function returnPreview(page){
 returnModel();returnEligibilityModel();
 await page.locator('#riskrail [data-rp-platform-menu="6"] [data-rp-platform-option="all"]').click();
 await page.locator('#riskrail [data-rp-platform-menu="6"] [data-rp-platform-option="抖音"]').click();
 const audit=await page.evaluate(()=>({returns:window.returnDeteriorationSnapshot(),quality:window.qualityMonthlyAudit()}));
 assert(audit.returns.rows.every(r=>Number.isFinite(r.netSales)&&r.netSales>100),'真实榜单全部满足去退后销量＞100');
 const worsened=(current,previous,threshold)=>Number.isFinite(current)&&previous>0&&(current-previous)/previous*100>threshold+1e-9;
 assert(audit.returns.rows.every(r=>worsened(r.returnRate,r.previousRate,10)||worsened(r.receivedRate,r.previousReceivedRate,10)),'真实榜单使用两期比率的相对增长率');
 assert(audit.quality.every(m=>m.returnHit===(m.current.orders>=100&&worsened(m.current.returnRate,m.previous.returnRate,3))),'最终品质覆盖层使用上期实际总退，不再使用目标加5');
 const card=page.locator('#riskrail [data-rp-board="6"]'),rateKeys=['return','received','unreceived'];
 const rule=await card.locator('.rhead .card-metric-help').getAttribute('data-metric-rule');
 assert.doesNotMatch(rule,/下架≥2次|罚款≥5000元|处罚≥2次/);
 assert.match(rule,/销量＞100件/);assert.match(rule,/总退环比增长率＞10%.*已收退环比增长率＞10%/);
 assert(await card.locator('.rp-return-entry').count()>0);
 const first=card.locator('.rp-return-entry').first().locator('[data-rp-platform-row="'+audit.returns.platform+'"]');
 assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),['return','received','unreceived','gsv']);
 for(const width of [1440,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await card.locator('.rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'退货卡片溢出 '+width);
 }
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/return-card.png',import.meta.url))});
 await card.locator('[data-risk="6"]').click();
 const table=page.locator('.rp-return-table');const columns=await table.locator('th').count();
 assert.equal(await table.locator('.rp-list-risks').count(),0);
 assert(!(await table.locator('th').allTextContents()).some(text=>['类目'].includes(text.trim())));assert(await table.getByText('属性',{exact:true}).count());
 assert.equal(await table.locator('[data-rp-sort="margin"]').count(),1,'完整榜单保留利润率');
 for(const key of ['gsv',...rateKeys]){
  const rate=rateKeys.includes(key),sortKey=rate?key+'Growth':key;
  const index=await table.locator('[data-rp-sort="'+sortKey+'"]').evaluate(e=>e.closest('th').cellIndex);
  const cardCell=first.locator('[data-rp-field="'+key+'"]'),listCell=table.locator('tbody tr').first().locator('td').nth(index);
  assert.equal(await listCell.locator('strong').innerText(),await cardCell.locator('strong').innerText());
  if(rate)assert.equal(await listCell.locator('em').innerText(),await cardCell.locator('small').innerText());
 }
 for(const key of ['fine','frozen','offShelf'])assert.equal(await table.locator('[data-rp-sort="'+key+'"]').count(),0);
 assert.equal(await table.locator('tbody tr').evaluateAll((rows,count)=>rows.every(r=>r.cells.length===count),columns),true,'退货榜表头与数据列对齐');
 assert.equal(await table.locator('[data-rp-trend],.rp-mini-trend').count(),0);
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:fileURLToPath(new URL('../../outputs/return-drawer-right.png',import.meta.url))});
 await page.locator('#close').click();
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();
 const snapshot=await page.evaluate(()=>businessRuleConfigSnapshot());
 for(const key of ['quality.worsenReturn','quality.worsenReceived'])assert.deepEqual(snapshot.conditions[key],{op:'gt',a:10});
 assert(!snapshot.items.some(rule=>rule.key.startsWith('quality.worsen')),'退货恶化规则由统一固定阈值维护');
 console.log('通过：退货恶化净销量99/100/101、双分支门槛、问号说明、固定10%阈值及条件组');
}
