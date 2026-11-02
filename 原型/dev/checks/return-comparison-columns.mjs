import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyRankingRules(){
 const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10),calls=[];
 const context={riskRateDelta:(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?a-b:null,upIdentity:row=>({spuId:row.spuId}),
  shiftDate:shift,dateRangeMonthShift:(month,step)=>{const [year,value]=month.split('-').map(Number);return new Date(Date.UTC(year,value-1+step,1)).toISOString().slice(0,7)},
  upSummary:(identity,start,end,platform)=>{calls.push({id:identity.spuId,start,end,platform});return {gsvCents:(start==='2026-10-01'?{a:900,b:200,c:300,d:100,e:500}:{a:100,b:200,c:300,d:400,e:500})[identity.spuId]}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 const row=(spuId,total,received,extra={})=>({spuId,returnRate:total,previousRate:0,receivedRate:received,previousReceivedRate:0,...extra});
 const period={comparisonMode:'week',start:'2026-10-06',end:'2026-10-12',reference:'2026-10-28'};
 const rows=[row('a',4,1,{qualityViolation:true,qualityFine:999999,gsvCents:999999}),row('b',1,5),row('c',3,4),row('d',null,4),row('e',null,null)];
 assert.deepEqual(Array.from(context.rpRankReturnRows(rows,period),r=>r.spuId),['b','d','c','a','e'],'最大已收退涨幅优先；同涨幅按近30天GSV，不按处罚或销量');
 assert(calls.every(call=>call.start==='2026-09-29'&&call.end==='2026-10-28'&&call.platform==='all'),'近30天截至所选基准日，使用全平台GSV');
 calls.length=0;
 const same=[row('a',4,1,{id:1}),row('a',2,4,{id:2})];
 assert.deepEqual(Array.from(context.rpRankReturnRows(same,period),r=>r.id),[1,2],'同SPU同涨幅保留稳定顺序');assert.equal(calls.length,1,'每SPU近30天销售额只汇总一次');
 calls.length=0;
 const monthPeriod={comparisonMode:'month',start:'2026-10-01',end:'2026-10-12',reference:'2026-10-28'};
 assert.deepEqual(Array.from(context.rpRankReturnRows(rows,monthPeriod),r=>r.spuId),['b','d','c','a','e'],'当前周/月使用同一近30天销售额口径');
 assert(calls.every(call=>call.start==='2026-09-29'&&call.end==='2026-10-28'&&call.platform==='all'),'当月仍截至基准日，不限于退货成熟区间');
 for(const [period,expected] of [
  [{comparisonMode:'month',start:'2026-09-01',end:'2026-09-30',reference:'2026-10-28'},['2026-09-01','2026-09-30']],
  [{comparisonMode:'month',start:'2028-02-01',end:'2028-02-29',reference:'2028-03-21'},['2028-01-31','2028-02-29']],
  [{comparisonMode:'week',start:'2026-12-11',end:'2026-12-17',reference:'2027-01-02'},['2026-12-04','2027-01-02']],
  [{comparisonMode:'week',start:'2026-12-29',end:'2027-01-04',reference:'2027-01-20'},['2026-12-22','2027-01-20']]
 ]){
  const range=context.rpReturnRankRange(period);assert.deepEqual([range.start,range.end],expected,'历史月、闰月与跨年均为完整30天');
 }
}

async function verifyDefaultRanking(page,board){
 const audit=await page.evaluate(()=>riskBoardPeriodAudit().find(board=>board.kind===6));
 const facts=audit.ranking.map(row=>({...row,growth:Math.max(...[[row.returnRate,row.previousRate],[row.receivedRate,row.previousReceivedRate]].filter(values=>values.every(Number.isFinite)).map(([now,before])=>now-before))}));
 const expected=[...facts].sort((a,b)=>Math.abs(b.growth-a.growth)>1e-9?b.growth-a.growth:b.currentGsvCents-a.currentGsvCents);
 const ranking={actual:facts.map(row=>row.id),expected:expected.map(row=>row.id),spus:[...new Set(expected.map(row=>row.spuId))].slice(0,6)};
 assert.deepEqual(ranking.actual,ranking.expected,'周/月默认记录按环比最大值与近30天GSV排序');
 assert.deepEqual(await board.locator('[data-rp-spu]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSpu)),ranking.spus,'首页TOP6按所选平台的最大涨幅去重SPU');
 return ranking.expected;
}

function verifyHighlightBoundaries(){
 const context=businessRuleContext();
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 for(const [key,threshold] of [['return',3],['received',2]]){
  for(const value of [null,NaN,-1,0,threshold-0.1,threshold,threshold+1e-12])assert.equal(context.rpReturnGrowthHighlighted(key,value),false,key+'未严格超过阈值');
  assert.equal(context.rpReturnGrowthHighlighted(key,threshold+0.01),true,'按原值判断，显示值即使取整为阈值也命中');
 }
 context.brcSaved={conditions:context.brcConditions()};context.brcSaved.conditions['quality.worsenReturn']={op:'gt',a:5};
 assert.equal(context.rpReturnGrowthHighlighted('return',4),false,'不硬编码旧阈值');assert.equal(context.rpReturnGrowthHighlighted('return',5.1),true);
}

function verifyTargetDeviations(){
 const context=businessRuleContext({upIdentity:record=>record,qrbReturnTargets:record=>record.targets,
  upPercent:value=>value.toFixed(1)+'%'});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 const fields=[{key:'return',sortValue:24.1,target:'环比 +3.1%',targetNumericSignal:true},{key:'received',sortValue:17.1,target:'环比 +1.2%',targetNumericSignal:true},{key:'returnGrowth',value:'+3.1%'},{key:'receivedGrowth',value:'+1.2%'}];
 const restored=context.rpReturnListFields(fields,{channel:'抖音',targets:{returnTarget:9,receivedTarget:6}});
 assert.equal(restored[0].target,'偏差 +15.1%');assert.equal(restored[1].target,'偏差 +11.1%');
 assert.equal(restored[0].targetNumericSignal,false,'偏差背景走原偏差规则，不沿用环比阈值标记');
 assert.equal(restored[2],fields[2]);assert.equal(restored[3],fields[3]);assert.equal(fields[0].target,'环比 +3.1%','首页字段不被修改');
 const below=context.rpReturnListFields(fields,{channel:'天猫',targets:{returnTarget:25,receivedTarget:18}});
 assert.equal(below[0].target,'偏差 -0.9%');assert.equal(below[1].target,'偏差 -0.9%');
 const missing=context.rpReturnListFields(fields,{channel:'天猫',targets:{returnTarget:null,receivedTarget:null}});
 assert.equal(missing[0].target,'');assert.equal(missing[1].target,'','缺少目标不编造偏差');
}

export async function returnComparisonColumns(page){
 verifyRankingRules();
 verifyHighlightBoundaries();
 verifyTargetDeviations();
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const board=page.locator('#riskrail [data-rp-board="6"]'),table=page.locator('#dialogbody .rp-return-table');
 const codes=await page.evaluate(()=>Object.fromEntries(referenceSampleAudit().spus.map(row=>[row.spuId,row.spuCode])));
 for(const mode of ['week','month']){
  await board.locator('[data-rp-return-mode="'+mode+'"]').click();
  const defaultIds=await verifyDefaultRanking(page,board);
  const facts=await page.evaluate(()=>riskPlatformCardsSnapshot().boards.find(row=>row.kind===6));
  const cardComparison=await board.locator('[data-rp-field="return"] small').first().innerText();
  assert.match(cardComparison,/^环比\s/,'卡片继续展示辅助环比');assert.doesNotMatch(cardComparison,/\u767e\u5206\u70b9/);
  for(const record of facts.records)for(const fact of record.platforms.filter(row=>facts.displayPlatforms.includes(row.platform))){
   const cardRow=board.locator('[data-rp-spu="'+record.spuId+'"] [data-rp-platform-row="'+fact.platform+'"]');
   for(const [key,actual,previous,threshold] of [['return',fact.returnRate,fact.previousReturnRate,3],['received',fact.receivedRate,fact.previousReceivedRate,2]]){
    const hit=Number.isFinite(actual)&&Number.isFinite(previous)&&actual-previous>threshold+1e-9,cell=cardRow.locator('[data-rp-field="'+key+'"]');
    assert.equal(await cell.locator('small .number-signal--red').count(),hit?1:0,'卡片只标记超阈值的环比数值');
    assert.equal(await cell.locator('.rp-comparison-label .number-signal,strong .number-signal').count(),0,'环比标签和退货率主值不加背景');
   }
  }
  await board.locator('[data-risk="6"]').click();
  assert.deepEqual(await table.locator('tbody [data-riskitem]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.riskitem.split(',')[1]))),defaultIds.slice(0,20),'完整榜单默认顺序与首页共用新规则');
  const keys=await table.locator('thead [data-rp-sort]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSort));
  assert.deepEqual(keys.slice(keys.indexOf('return'),keys.indexOf('receivedGrowth')+1),['return','returnGrowth','received','receivedGrowth']);
  assert.equal(await table.locator('[data-rp-sort="returnGrowth"]').innerText().then(text=>text.trim()),'总退环比');
  assert.equal(await table.locator('[data-rp-sort="receivedGrowth"]').innerText().then(text=>text.trim()),'已收退环比');
  const headers=await table.locator('thead th').allTextContents(),index=key=>headers.findIndex(text=>text.trim()===key);
  let checked=0;
  for(const record of facts.records)for(const fact of record.platforms.filter(row=>facts.displayPlatforms.includes(row.platform))){
   const row=table.locator('tbody tr').filter({hasText:codes[record.spuId]}).filter({has:page.locator('img.rp-platform-mark[alt="'+fact.platform+'"]')});
   if(!await row.count())continue;
   for(const [name,current,previous] of [['总退',fact.returnRate,fact.previousReturnRate],['已收退',fact.receivedRate,fact.previousReceivedRate]]){
    const delta=Number.isFinite(current)&&Number.isFinite(previous)?Math.sign(current-previous)*Math.round(Math.abs(current-previous)*10)/10:null;
    const expected=delta===null?'--':delta===0?'持平':(delta>0?'+':'')+delta.toFixed(1)+'%';
    assert.equal(await row.locator('td').nth(index(name+'环比')).innerText(),expected,mode+' '+record.spuId+' '+fact.platform+' '+name);
    const hit=Number.isFinite(current)&&Number.isFinite(previous)&&current-previous>(name==='总退'?3:2)+1e-9;
    assert.equal(await row.locator('td').nth(index(name+'环比')).locator('.number-signal--red').count(),hit?1:0,'完整榜单标签使用相同阈值');
    const deviation=row.locator('td').nth(index(name)).locator('em');
    if(Number.isFinite(current))assert.match(await deviation.innerText(),/^偏差\s[+-]?\d+\.\d%$/,'比率下方保留实际减目标的偏差');
    assert.doesNotMatch(await row.locator('td').nth(index(name)).innerText(),/环比/,'偏差与独立环比列各司其职');checked++;
   }
  }
  assert(checked>=6,'核对多个SPU与平台的实际两期差值');
  for(const key of ['returnGrowth','receivedGrowth'])for(const direction of ['desc','asc']){
   await table.locator('[data-rp-sort="'+key+'"]').click();
   const heading=table.locator('th:has([data-rp-sort="'+key+'"])');assert.equal(await heading.getAttribute('aria-sort'),direction==='desc'?'descending':'ascending');
   const position=await heading.evaluate(element=>element.cellIndex);
   const values=await table.locator('tbody tr').evaluateAll((rows,index)=>rows.map(row=>{const text=row.cells[index].innerText;return text==='持平'?0:parseFloat(text)}),position);
   const valid=values.filter(Number.isFinite);assert.deepEqual(valid,[...valid].sort((a,b)=>direction==='desc'?b-a:a-b),'按有符号数值排序');
   const missing=values.findIndex(value=>!Number.isFinite(value));if(missing>=0)assert(values.slice(missing).every(value=>!Number.isFinite(value)),'缺失置后');
  }
  await table.evaluate(element=>element.scrollLeft=element.scrollWidth);
  assert(await table.locator('th').filter({hasText:/^属性$/}).evaluate(element=>element.getBoundingClientRect().right<=element.parentElement.querySelector('th:last-child').getBoundingClientRect().left+1),'滚动后属性列不被固定操作列遮住');
  if(mode==='month')await page.locator('#dialog').screenshot({path:'outputs/return-comparison-columns-1920.png'});
  await page.locator('#close').click();
 }
 console.log('通过：周/月默认排名、环比独立列、目标偏差恢复、首页环比保留及正负排序。');
}
