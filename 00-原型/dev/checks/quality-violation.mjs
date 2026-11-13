import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function violationModel(){
 const ctx=vm.createContext({shiftDate:(day,offset)=>new Date(Date.parse(day)+offset*86400000).toISOString().slice(0,10)});
 const source=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 vm.runInContext(source('quality-metrics/00-violation-ranking.js'),ctx);
 const event=(type,patch={})=>({type,reasonType:'quality',amount:0,...patch});
 const row=(id,events,gsv=100,patch={})=>({id,spuId:String(id),monthly:{events,...patch},spuGsv30Cents:gsv});
 const mixed=[event('罚款'),event('下架'),event('掉权')],frozen=[event('资金冻结',{amount:999999})];
 assert(ctx.qfViolationCompare(row(2,mixed,1),row(1,frozen,9999))<0,'四类次数相加，不能按类型或金额优先');
 assert(ctx.qfViolationCompare(row(2,frozen,101),row(1,[event('罚款')],100))<0,'同次数按SPU近30天GSV');
 assert(ctx.qfViolationCompare(row(1,frozen,100,{fine:999999,contactHit:true,relatedLinkGsv30Cents:9999}),row(2,[event('下架')],100))<0,'次数及GSV相同只用稳定身份');
 assert(ctx.qfViolationCompare(row(2,frozen,0),row(1,frozen,null))<0,'真实零值优先于缺失GSV');
 assert.equal(ctx.qfViolationRisks({contactHit:true,returnHit:true}).length,0,'仅进线/退货异常不入榜');
 assert.equal(ctx.qfViolationRisks({events:[event('罚款',{reasonType:'logistics'}),event('限单')]}).length,0,'非品质处罚及其他类型不计入');
 const repeated=[event('资金冻结',{linkId:'same'}),event('资金冻结',{linkId:'same'}),...mixed];
 assert.equal(ctx.qfViolationSortFacts(row(1,repeated)).totalCount,5,'同一链接多次处罚按发生次数累加，零金额事件保留');
 const catalog=[{id:1,spuId:'1'},{id:2,spuId:'2'},{id:3,spuId:'3'}],channels=['抖音','快手'];
 Object.assign(ctx,{window:{},qrPlatforms:channels,qrCatalog:()=>catalog,upIdentity:p=>p,rpLossReturnTarget:()=>10,copyFactRecord:(...objects)=>Object.defineProperties({},Object.assign({},...objects.map(Object.getOwnPropertyDescriptors))),
  qrObservation:(p,platform,start,end)=>({id:p.id,spuId:p.spuId,key:p.id+':'+channels.indexOf(platform),platform,monthly:{start,end,current:{sales:10},previous:{sales:5},events:p.id===1?(platform==='抖音'?[event('罚款')]:platform==='快手'?[event('下架'),event('下架')]:[]):p.id===2&&platform==='抖音'?frozen:[],contactHit:true}}),
  upSummary:(p,start,end,platform)=>{assert.equal(start,'2026-09-27');assert.equal(end,'2026-10-26');assert.equal(platform,'all');return {gsvCents:p.id===1?10:10000}}});
 vm.runInContext(source('quality-metrics/02-violation-spus.js'),ctx);
 const rows=ctx.qfViolationSpuRows('all','2026-10-01','2026-10-26');
 assert.deepEqual(Array.from(rows,r=>r.spuId),['1','2'],'跨平台合并每个SPU一条，进线样例排除');assert.equal(rows[0].violationRanking.totalCount,3);assert.equal(rows[0].monthly.events.length,3);
 const scoped=ctx.qfViolationSpuRows('抖音','2026-10-01','2026-10-26');assert.equal(scoped[0].violationRanking.totalCount,3,'平台筛选后仍按全平台总次数排序');assert.equal(scoped[0].monthly.events.length,1,'单平台展示使用该平台事件');
 assert.equal(ctx.qfViolationSpuRows('快手','2026-10-01','2026-10-26').length,1);
 console.log('通过：品质四类事件、SPU跨平台合并、逐次计数、全平台次数/30天GSV排序与平台筛选');
}
export async function qualityViolation(page){
 violationModel();
 // 固定该排除样例的观察日；随系统日期滚动后，不保证仍命中相同演示事件。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const snapshot=await page.evaluate(()=>window.qualityViolationRankingSnapshot());
 assert(snapshot.rows.length>0);
 const pool=snapshot.rule.split('排序规则')[0].split('总退/已收退红黄绿规则')[0];assert.doesNotMatch(pool,/总退环比|退货率|有效订单/);
 assert.doesNotMatch(pool,/进线/);assert.match(snapshot.rule,/全平台上述四类违规总次数从高到低/);assert.match(snapshot.rule,/SPU近30天GSV从高到低/);
 assert(snapshot.candidates.some(r=>!r.facts.totalCount),'覆盖无品质处罚的排除样例');
 assert.equal(new Set(snapshot.records.map(r=>r.spuId)).size,snapshot.records.length);
 for(const row of snapshot.records){assert(row.facts.totalCount>0);assert.equal(row.facts.totalCount,snapshot.candidates.filter(r=>r.spuId===row.spuId).reduce((sum,r)=>sum+r.facts.totalCount,0),'全平台违规总次数逐事件合计');}
 for(const candidate of snapshot.candidates)assert(!candidate.risks.some(r=>/退货|总退|进线/.test(r)));
 const ordered=snapshot.records;
 for(let i=1;i<ordered.length;i++){
  const previous=ordered[i-1].facts,current=ordered[i].facts;
  assert(previous.totalCount>current.totalCount||previous.totalCount===current.totalCount&&previous.gsv30>=current.gsv30,'默认按全平台违规总次数、SPU近30天GSV降序');
 }
 const cardKeys=await page.locator('#riskrail .qr-card .rp-quality-entry [data-qr-detail]').evaluateAll(nodes=>nodes.map(n=>n.dataset.qrDetail));assert.deepEqual(cardKeys,snapshot.rows.slice(0,6),'卡片沿用实际默认排序');
 await page.locator('#riskrail [data-risk="0"]').click();
 const drawerKeys=[];
 for(;;){
  drawerKeys.push(...await page.locator('#qr-list-table tbody [data-qr-detail]').evaluateAll(nodes=>nodes.map(n=>n.dataset.qrDetail)));
  const next=page.locator('#rp-list-pagination [aria-label="下一页"]');if(await next.isDisabled())break;await next.click();
 }
 const selected=Array.isArray(snapshot.platform)?snapshot.platform:[snapshot.platform];
 const expectedRows=snapshot.records.flatMap(record=>snapshot.candidates.filter(row=>row.spuId===record.spuId&&row.facts.totalCount>0&&(selected.includes('all')||selected.includes(row.platform))).map(row=>row.key));
 assert.deepEqual(drawerKeys,expectedRows,'抽屉沿产品榜顺序展开各平台，一产品单平台一行');assert.equal(new Set(drawerKeys).size,drawerKeys.length);
 await page.locator('#close').click();
 await page.locator('#riskrail [data-rp-platform-menu="0"] [data-rp-platform-option="all"]').click();
 const all=await page.evaluate(()=>qualityViolationRankingSnapshot());assert.equal(all.records.length,new Set(all.candidates.filter(r=>r.facts.totalCount>0).map(r=>r.spuId)).size,'全平台SPU去重');
 for(const platform of ['抖音','快手','拼多多'])assert.equal(Number(await page.locator('#riskrail [data-rp-platform-menu="0"] [data-rp-platform-option="'+platform+'"] b').innerText()),new Set(all.candidates.filter(r=>r.platform===platform&&r.facts.totalCount>0).map(r=>r.spuId)).size,'平台计数一致 '+platform);
 await page.locator('#riskrail [data-risk="0"]').click();
 const countColumn=await page.locator('#qr-list-table [data-rp-sort="violations"]').evaluate(node=>node.closest('th').cellIndex);
 for(const tr of await page.locator('#qr-list-table tbody tr').all()){
  const key=await tr.locator('[data-qr-detail]').getAttribute('data-qr-detail'),expected=all.candidates.find(row=>row.key===key).facts.totalCount;
  assert.equal(Number((await tr.locator('td').nth(countColumn).locator('strong').innerText()).replaceAll(',','')),expected,'抽屉每行违规次数使用该平台独立事实');
 }
 const firstKey=await page.locator('#qr-list-table tbody [data-qr-detail]').first().getAttribute('data-qr-detail');
 await page.locator('#qr-list-table tbody [data-qr-detail]').first().click();assert(await page.locator('.up-detail').isVisible(),'单平台行可打开详情');
 assert.equal(await page.locator('#up-platform').inputValue(),all.candidates.find(row=>row.key===firstKey).platform,'详情继承该行平台');await page.locator('#close').click();
 assert.equal(await page.locator('#qr-list-table tbody [data-qr-detail]').first().getAttribute('data-qr-detail'),firstKey,'返回保留平台行及页码');
 const riskMenu=page.locator('#dialogbody [data-pf-multi-label="风险类型"]');
 const options=riskMenu.locator('.pf-multi-option span');
 const expectedOptions=['全部','平台罚款','资金冻结','链接下架','链接掉权'];
 await riskMenu.locator('summary').click();
 assert.deepEqual(await options.allTextContents(),expectedOptions);
 const total=()=>page.locator('#rp-list-pagination nav').evaluateAll(nodes=>Number(nodes[0]?.dataset.listTotal||0));
 const riskSelect=riskMenu.locator('select');
 for(const [value,key] of [['offShelf','offShelfCount'],['drop','dropCount']]){
  const expected=all.candidates.filter(row=>row.facts[key]>0).length;
  assert(expected>0,'覆盖实际发生的'+value);
  await riskSelect.selectOption(value,{force:true});
  assert.equal(await total(),expected,'分别匹配下架和掉权');
 }
 await riskSelect.selectOption(['offShelf','drop'],{force:true});
 assert.equal(await total(),all.candidates.filter(row=>row.facts.offShelfCount>0||row.facts.dropCount>0).length,'多选匹配任一风险');
 await riskSelect.selectOption('drop',{force:true});
 await page.locator('#qr-list-platform').selectOption('抖音',{force:true});
 assert.deepEqual(await options.allTextContents(),expectedOptions,'切换平台仍显示四类风险');
 assert.equal(await riskSelect.inputValue(),'drop','切换平台保留所选风险');
 assert.equal(await total(),0,'所选平台无掉权记录时显示空榜');
}
