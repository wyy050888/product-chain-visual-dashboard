import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

const rateGrowth=(current,previous)=>Number.isFinite(current)&&Number.isFinite(previous)&&previous>0?(current-previous)/previous*100:null;

function verifyRankingRules(){
 const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10),calls=[];
 const context={upIdentity:row=>({spuId:row.spuId}),
  shiftDate:shift,dateRangeMonthShift:(month,step)=>{const [year,value]=month.split('-').map(Number);return new Date(Date.UTC(year,value-1+step,1)).toISOString().slice(0,7)},
  upSummary:(identity,start,end,platform)=>{calls.push({id:identity.spuId,start,end,platform});return {gsvCents:(start==='2026-10-01'?{a:900,b:200,c:300,d:100,e:500}:{a:100,b:200,c:300,d:400,e:500})[identity.spuId]}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../../src/modules/period/00-rate-growth.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 const row=(spuId,total,received,extra={})=>({spuId,returnRate:total===null?null:10+total,previousRate:10,receivedRate:received===null?null:10+received,previousReceivedRate:10,...extra});
 const period={comparisonMode:'week',start:'2026-10-06',end:'2026-10-12',reference:'2026-10-28'};
 const rows=[row('a',4,1,{returnRate:55,previousRate:50,qualityViolation:true,qualityFine:999999,gsvCents:999999}),row('b',1,5),row('c',3,4),row('d',null,4),row('e',null,null)];
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

function verifyDeviationRanking(){
 const facts={
  a:{returnRate:11,receivedRate:1,gsvCents:400},
  b:{returnRate:6,receivedRate:10,gsvCents:300},
  c:{returnRate:6.9,receivedRate:5.7,gsvCents:200},
  d:{returnRate:null,receivedRate:6.8,gsvCents:150},
  e:{returnRate:10,receivedRate:null,gsvCents:100},
  f:{returnRate:20,receivedRate:20,sales:100},
  g:{returnRate:7,receivedRate:5.5}
 };
 const products=new Map(Object.keys(facts).map(spuId=>[spuId,{spuId}])),queries=[];
 const period={comparisonMode:'week',start:'2026-10-06',end:'2026-10-12',reference:'2026-10-28'};
 const context=businessRuleContext({upSpus:products,upProduct:product=>product,upIdentity:row=>products.get(row.spuId),
  upWindow:()=>period,periodFor:()=>period,upChannels:()=>['抖音','天猫'],
  shiftDate:(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10),
  upUnreceivedRate:summary=>summary.returnRate-summary.receivedRate,
  qrbReturnTargets:()=>({returnTarget:5,receivedTarget:5}),
  upSummary:({spuId},start,end,platform)=>{
   if(platform==='all'){queries.push({spuId,start,end});return {gsvCents:spuId==='e'?900:100}}
   return platform==='抖音'||spuId==='e'?{sales:101,...facts[spuId]}:{sales:0};
  }});
 for(const file of ['01-return.js','01-return-deviation.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),context);
 const ranked=Array.from(context.rpDeviationRows('all'),row=>row.spuId);
 assert.deepEqual(ranked,['a','e','e','b','c','d'],'按两项偏差原值最大值，同分按全平台近30天销售额');
 assert.deepEqual(queries.map(query=>query.spuId).sort(),['b','e'],'只在同分时查询近30天销售额，同SPU只查一次');
 assert(queries.every(query=>query.start==='2026-09-29'&&query.end==='2026-10-28'),'近30天截至所选基准日');
}

async function verifyDefaultRanking(page,board){
 const audit=await page.evaluate(()=>riskBoardPeriodAudit().find(board=>board.kind===6));
 const facts=audit.ranking.map(row=>({...row,growth:Math.max(...[[row.returnRate,row.previousRate],[row.receivedRate,row.previousReceivedRate]].map(([now,before])=>rateGrowth(now,before)).filter(Number.isFinite))}));
 const expected=[...facts].sort((a,b)=>Math.abs(b.growth-a.growth)>1e-9?b.growth-a.growth:b.currentGsvCents-a.currentGsvCents);
 const ranking={actual:facts.map(row=>row.id),expected:expected.map(row=>row.id),spus:[...new Set(expected.map(row=>row.spuId))].slice(0,6)};
 assert.deepEqual(ranking.actual,ranking.expected,'周/月默认记录按环比最大值与近30天GSV排序');
 assert.deepEqual(await board.locator('[data-rp-spu]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSpu)),ranking.spus,'首页TOP6按所选平台的最大涨幅去重SPU');
 return ranking.expected;
}

function verifyHighlightBoundaries(){
 const context=businessRuleContext();
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 for(const [key,threshold] of [['return',10],['received',10]]){
  for(const value of [null,NaN,-1,0,threshold-0.1,threshold,threshold+1e-12])assert.equal(context.rpReturnGrowthHighlighted(key,value),false,key+'未严格超过阈值');
  assert.equal(context.rpReturnGrowthHighlighted(key,threshold+0.01),true,'按原值判断，显示值即使取整为阈值也命中');
 }
 const confirmed=fs.readFileSync(new URL('../../src/modules/product-filters/03-confirmed-risk.js',import.meta.url),'utf8');
 vm.runInContext(confirmed.slice(confirmed.indexOf('function pfReturnCauses(')),context);
 const causes=(netSales,returnRate,previousRate,receivedRate,previousReceivedRate)=>Array.from(context.pfReturnCauses({netSales,returnRate,previousRate,receivedRate,previousReceivedRate}));
 assert.deepEqual(causes(101,11,10,5.5,5),[],'恰好10%不入榜');
 assert.deepEqual(causes(100,11.01,10,5.51,5),[],'销量恰好100件不入榜');
 assert.deepEqual(causes(101,11.01,10,5.5,5),['总退环比恶化']);
 assert.deepEqual(causes(101,11.01,0,5.51,5),['已收退环比恶化'],'总退无可比基数时，仍可由已收退条件入榜');
 assert.deepEqual(causes(101,11.01,0,5.51,null),[],'零基期或缺失不参与判定');
 context.brcSaved={conditions:context.brcConditions()};context.brcSaved.conditions['quality.worsenReturn']={op:'gt',a:5};
 assert.equal(context.rpReturnGrowthHighlighted('return',4),false,'不硬编码旧阈值');assert.equal(context.rpReturnGrowthHighlighted('return',5.1),true);
}

async function verifyActualRateColors(board){
 const colors=await board.locator('[data-comparison-first]>small .rp-card-actual-value').evaluateAll(nodes=>nodes.map(node=>({
  label:getComputedStyle(node.closest('small')).color,value:getComputedStyle(node).color
 })));
 assert(colors.length>0);
 assert(colors.every(({label,value})=>label==='rgb(134, 147, 164)'&&value==='rgb(0, 0, 0)'),'实际标签灰色，有效数值黑色');
}

async function verifyDeviationBoard(page){
 const board=page.locator('#riskrail [data-rp-board="8"]');
 assert.equal(await board.evaluate(node=>node.previousElementSibling.dataset.rpBoard),'6');
 const help=await board.locator('.rhead .card-metric-help').getAttribute('data-metric-rule');
 assert.match(help,/1\. 按SPU的总退、已收退偏差最大值从高到低排序\n2\. 偏差相同，按该SPU近30天销售额从高到低排序/);
 const maxDeviation=values=>Math.max(...values.map(value=>parseFloat(value.replaceAll(',','').replace('−','-'))).filter(Number.isFinite));
 const products=await board.locator('[data-rp-spu]').evaluateAll(nodes=>nodes.map(node=>({
  spuId:node.dataset.rpSpu,values:[...node.querySelectorAll('[data-rp-field="return"] strong,[data-rp-field="received"] strong')].map(metric=>metric.textContent)
 })));
 assert.equal(new Set(products.map(row=>row.spuId)).size,products.length,'首页每个SPU仅展示一次');
 const cardOrder=products.map(row=>maxDeviation(row.values));
 assert.deepEqual(cardOrder,[...cardOrder].sort((a,b)=>b-a),'首页按SPU最大偏差降序');
 const card=board.locator('.rp-platform-product').first(),row=card.locator('[data-rp-platform-row]').first();
 const labels=card.locator('[data-rp-metric-label]');
 assert.deepEqual(await labels.allTextContents(),['总退偏差','已收退偏差','未收退','10/6–10/12 GSV']);
 for(const key of ['return','received']){
  const cell=row.locator('[data-rp-field="'+key+'"]');
  assert.match(await cell.locator('strong').innerText(),/^(?:[+−]?\d[\d,]*\.\d%|—)$/);
  assert.equal(await cell.locator('.rp-comparison-label').count(),0);
  assert.match(await cell.locator('small').innerText(),/^实际\s(?:\d+\.\d%|—)$/);
  assert.equal(await cell.locator('small').getAttribute('class'),'rp-quality-gray');
 }
 assert(await row.locator('[data-comparison-first] strong.rp-quality-red').count()>0,'命中的偏差显示红色数字');
 assert.equal(await board.locator('.number-signal--red').count(),0,'偏差榜首页没有红底数字');
 const unreceived=row.locator('[data-rp-field="unreceived"]');
 assert.match(await unreceived.locator('strong').innerText(),/^(?:\d+\.\d%|—)$/);
 assert.equal(await unreceived.locator('small').count(),0,'未收退只显示一行实际率');
 assert.equal(await board.locator('[data-rp-field="unreceived"] .rp-card-actual-value').first().evaluate(node=>getComputedStyle(node).color),'rgb(0, 0, 0)');
 await verifyActualRateColors(board);
 await board.locator('[data-rp-return-mode="month"]').click();
 await board.locator('[data-rp-return-month]').selectOption('9');
 assert.equal(await labels.last().innerText(),'9月 GSV');
 await board.locator('[data-risk="8"]').click();
 const table=page.locator('#rf-list-table table');
 const headers=(await table.locator('thead th').allTextContents()).map(value=>value.trim());
 assert.deepEqual(headers,['序号','SPU信息','总退偏差','已收退偏差','未收退','GSV','销量','利润率','操作']);
 const platforms=await table.locator('tbody tr').evaluateAll(rows=>rows.map(row=>({
  shown:row.cells[1].querySelector('.rp-platform-name > span:first-child + .rp-platform-mark')?.alt,
  expected:JSON.parse(row.querySelector('[data-rp-platform-detail]').dataset.rpPlatformDetail).platform
 })));
 assert(platforms.length>0&&platforms.every(({shown,expected})=>shown===expected),'平台图标紧跟SPU名称，并与详情平台一致');
 const gapColumns=['总退偏差','已收退偏差'].map(title=>headers.indexOf(title));
 const listValues=await table.locator('tbody tr').evaluateAll((rows,columns)=>rows.map(row=>columns.map(index=>row.cells[index].querySelector('strong').textContent)),gapColumns);
 const listOrder=listValues.map(maxDeviation);
 assert.deepEqual(listOrder,[...listOrder].sort((a,b)=>b-a),'完整榜单默认按最大偏差降序');
 const cells=table.locator('tbody tr').first().locator('td');
 for(const index of gapColumns){
  const cell=cells.nth(index);
  assert.match(await cell.locator('strong').innerText(),/^(?:[+−]?\d[\d,]*\.\d%|—)$/);
  assert.match(await cell.locator('em').innerText(),/^实际\s(?:\d+\.\d%|—)$/);
  const actual=cell.locator('.rp-card-actual-value');
  if(await actual.count())assert.equal(await actual.evaluate(node=>getComputedStyle(node).color),'rgb(0, 0, 0)');
 }
 assert(await table.locator('tbody strong.rp-quality-red').count()>0,'完整榜单的命中偏差显示红色数字');
 assert.equal(await table.locator('tbody .number-signal--red').count(),0,'完整偏差榜没有红底数字');
 const unreceivedCell=cells.nth(headers.indexOf('未收退'));
 assert.match(await unreceivedCell.innerText(),/^(?:\d+\.\d%|—)$/);
 assert.equal(await unreceivedCell.locator('em').count(),0);
 const metrics=await table.locator('tbody tr').evaluateAll((rows,{gsv,margin})=>{
  const cardRows=new Map([...document.querySelectorAll('#riskrail [data-rp-board="8"] [data-rp-platform-row]')].map(row=>[
   row.querySelector('[data-rp-platform-detail]').dataset.rpPlatformDetail,row
  ]));
  return rows.map(row=>{
   const card=cardRows.get(row.querySelector('[data-rp-platform-detail]').dataset.rpPlatformDetail);
   const cardComparison=card?.querySelector('[data-rp-field="gsv"] small .rp-comparison-value');
   const comparison=row.cells[gsv].querySelector('.rp-comparison-value');
   return {gsv:comparison.textContent,color:getComputedStyle(comparison).color,
    cardGsv:cardComparison?.textContent,cardColor:cardComparison&&getComputedStyle(cardComparison).color,
    margin:row.cells[margin].querySelector('strong').textContent};
  });
 },{gsv:headers.indexOf('GSV'),margin:headers.indexOf('利润率')});
 assert(metrics.some(metric=>metric.cardColor&&metric.cardColor!=='rgb(134, 147, 164)'),'样例覆盖有颜色的GSV环比');
 for(const metric of metrics){
  if(metric.cardColor)assert.deepEqual([metric.gsv,metric.color],[metric.cardGsv,metric.cardColor],'抽屉和卡片的GSV环比一致');
  assert.match(metric.margin,/^(?:-?\d+\.\d%|—)$/);
 }
 await page.locator('#rf-return-platform').selectOption('天猫',{force:true});
 assert((await table.locator('tbody .rp-platform-mark').all()).length>0);
 assert((await table.locator('tbody .rp-platform-mark').evaluateAll(nodes=>nodes.map(node=>node.alt))).every(name=>name==='天猫'));
 await table.locator('[data-rp-platform-detail]').first().click({timeout:30000});
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-09-01');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-09-30');
 assert.equal(await page.locator('#up-platform').inputValue(),'天猫');
 const detailRates=page.locator('.up-detail .up-return-metrics');
 assert(await detailRates.locator('.up-quality-comparison.rp-quality-red').count()>0,'产品详情的偏差显示红色数字');
 assert.equal(await detailRates.locator('.number-signal--red').count(),0,'产品详情的偏差没有红底');
 await page.locator('#close').click();
 if(await page.locator('#overlay').isVisible())await page.locator('#close').click();
}

export async function returnComparisonColumns(page){
 verifyRankingRules();
 verifyDeviationRanking();
 verifyHighlightBoundaries();
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await verifyDeviationBoard(page);
 const board=page.locator('#riskrail [data-rp-board="6"]'),table=page.locator('#dialogbody .rp-return-table');
 const help=await board.locator('.rhead .card-metric-help').getAttribute('data-metric-rule');
 assert.match(help,/总退环比增长率＞10%.*已收退环比增长率＞10%/);
 const codes=await page.evaluate(()=>Object.fromEntries(referenceSampleAudit().spus.map(row=>[row.spuId,row.spuCode])));
 const rates=[['return','总退环比'],['received','已收退环比'],['unreceived','未收退环比']];
 const growthKeys=rates.map(([key])=>key+'Growth');
 for(const mode of ['week','month']){
  await board.locator('[data-rp-return-mode="'+mode+'"]').click();
  const defaultIds=await verifyDefaultRanking(page,board);
  const facts=await page.evaluate(()=>riskPlatformCardsSnapshot().boards.find(row=>row.kind===6));
  const rateHeadings=board.locator('.rp-platform-card-head').first().locator('[data-rp-metric-label]:not([data-rp-metric-label="gsv"])');
  assert.deepEqual(await rateHeadings.allTextContents(),rates.map(([,name])=>name));
  await verifyActualRateColors(board);
  const flat=await board.locator('[data-flat-comparison]>.rp-comparison-value').evaluateAll(nodes=>nodes.map(node=>{
   const style=getComputedStyle(node);return [node.textContent,style.fontSize,style.fontWeight];
  }));
  assert(flat.every(([label,size,weight])=>label==='持平'&&size==='13px'&&weight==='500'),'持平按卡片数字的视觉大小显示');
  for(const key of ['return','received','unreceived']){
   const cell=board.locator('[data-rp-field="'+key+'"]').first();
   assert.match(await cell.locator('strong').innerText(),/^(?:[↑↓] [\d,]+\.\d%|持平|—)$/,'卡片主值直接展示环比数值');
   assert.match(await cell.locator('small').innerText(),/^实际\s/,'卡片辅值展示实际率');
  }
  for(const record of facts.records)for(const fact of record.platforms.filter(row=>record.violatedPlatforms.includes(row.platform))){
   const cardRow=board.locator('[data-rp-spu="'+record.spuId+'"] [data-rp-platform-row="'+fact.platform+'"]');
   for(const [key,actual,previous] of [['return',fact.returnRate,fact.previousReturnRate],['received',fact.receivedRate,fact.previousReceivedRate]]){
    const hit=rateGrowth(actual,previous)>10+1e-9,cell=cardRow.locator('[data-rp-field="'+key+'"]');
    if(hit)assert.equal(await cell.locator('strong.rp-quality-red').count(),1,'超阈值的环比数值显示红色');
    assert.equal(await cell.locator('strong .number-signal--red').count(),0,'环比数值没有红底');
    assert.equal(await cell.locator('.rp-comparison-label,small .number-signal').count(),0,'卡片不重复显示环比标签，实际率不加背景');
   }
  }
  await board.locator('[data-risk="6"]').click();
  assert.deepEqual(await table.locator('tbody [data-riskitem]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.riskitem.split(',')[1]))),defaultIds.slice(0,20),'完整榜单默认顺序与首页共用新规则');
  const keys=await table.locator('thead [data-rp-sort]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSort));
  assert.deepEqual(keys,[...growthKeys,'gsv','netSales','margin']);
  const headers=(await table.locator('thead th').allTextContents()).map(text=>text.trim());
  const columns=rates.map(([,name])=>headers.indexOf(name));
  assert(columns.every(index=>index>=0),'完整榜单显示三项退货环比列头');
  let checked=0;
  for(const record of facts.records)for(const fact of record.platforms.filter(row=>facts.displayPlatforms.includes(row.platform))){
   const row=table.locator('tbody tr').filter({hasText:codes[record.spuId]}).filter({has:page.locator('img.rp-platform-mark[alt="'+fact.platform+'"]')});
   if(!await row.count())continue;
   const cardRow=board.locator('[data-rp-spu="'+record.spuId+'"] [data-rp-platform-row="'+fact.platform+'"]');
   const cardValues=await cardRow.locator('[data-comparison-first]').evaluateAll(cells=>cells.map(cell=>[
    cell.querySelector('strong').textContent,cell.querySelector('small').textContent,getComputedStyle(cell.querySelector('strong')).color
   ]));
   const listValues=await row.evaluate((element,indexes)=>indexes.map(index=>{
    const cell=element.cells[index],primary=cell.querySelector('strong'),actual=cell.querySelector('em'),number=actual.querySelector('.rp-card-actual-value');
    return {display:[primary.textContent,actual.textContent,getComputedStyle(primary).color],labelColor:getComputedStyle(actual).color,
     valueColor:number&&getComputedStyle(number).color,highlight:cell.querySelector('.number-signal')!==null};
   }),columns);
   assert.deepEqual(listValues.map(value=>value.display),cardValues,'三项环比、实际值和主值颜色与卡片一致');
   for(const {display,labelColor,valueColor,highlight} of listValues){
    assert.match(display[1],/^实际\s(?:[\d,]+\.\d%|—)$/);
    assert.equal(labelColor,'rgb(134, 147, 164)');
    if(valueColor)assert.equal(valueColor,'rgb(0, 0, 0)');
    assert.equal(highlight,false,'完整榜单的环比没有色块');
   }
   for(const [index,current,previous] of [[0,fact.returnRate,fact.previousReturnRate],[1,fact.receivedRate,fact.previousReceivedRate]]){
    const growth=rateGrowth(current,previous),delta=growth===null?null:Math.sign(growth)*Math.round(Math.abs(growth)*10)/10;
    const expected=delta===null?'—':delta===0?'持平':(delta>0?'↑ ':'↓ ')+Math.abs(delta).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
    assert.equal(listValues[index].display[0],expected,mode+' '+record.spuId+' '+fact.platform+' '+rates[index][1]);checked++;
   }
  }
  assert(checked>=6,'核对多个SPU与平台的实际两期环比增长率');
  for(const key of growthKeys)for(const direction of ['desc','asc']){
   await table.locator('[data-rp-sort="'+key+'"]').click();
   const heading=table.locator('th:has([data-rp-sort="'+key+'"])');assert.equal(await heading.getAttribute('aria-sort'),direction==='desc'?'descending':'ascending');
   const position=await heading.evaluate(element=>element.cellIndex);
   const values=await table.locator('tbody tr').evaluateAll((rows,index)=>rows.map(row=>{
    const text=row.cells[index].querySelector('strong').innerText;
    return text==='持平'?0:parseFloat(text.replace(/^↑ /,'').replace(/^↓ /,'-').replaceAll(',',''));
   }),position);
   const valid=values.filter(Number.isFinite);assert.deepEqual(valid,[...valid].sort((a,b)=>direction==='desc'?b-a:a-b),'按有符号数值排序');
   const missing=values.findIndex(value=>!Number.isFinite(value));if(missing>=0)assert(values.slice(missing).every(value=>!Number.isFinite(value)),'缺失置后');
  }
  await table.evaluate(element=>element.scrollLeft=element.scrollWidth);
  assert(await table.locator('th').filter({hasText:/^属性$/}).evaluate(element=>element.getBoundingClientRect().right<=element.parentElement.querySelector('th:last-child').getBoundingClientRect().left+1),'滚动后属性列不被固定操作列遮住');
  if(mode==='month')await page.locator('#dialog').screenshot({path:'outputs/return-comparison-columns-1920.png'});
  await page.locator('#close').click();
 }
 console.log('通过：周/月默认排名、三项退货环比与卡片一致、按环比升降序。');
}
