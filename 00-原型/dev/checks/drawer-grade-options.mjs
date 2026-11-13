import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyCompleteMonthGrade(){
 let cutoff='2026-11-11';
 const calls=[],context=businessRuleContext({window:{},DATA_CUTOFF:'2028-03-01',boundedCache:()=>new Map(),upRuleRevision:0,
  iso:date=>date.toISOString().slice(0,10),
  shiftDate:(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10),
  riskRange:()=>({start:'2026-10-20',end:cutoff}),upIdentity:product=>product,upProduct:product=>product,
  upSummary:(product,start,end,platform)=>{
   calls.push([start,end,platform]);return {sales:1,gsvCents:(end==='2026-10-31'?650:100)*1000000};
  }});
 for(const file of ['date-range/01-model.js','key-products/07-grade-model.js','risk-presentation/03-product-grade.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),context);
 const old={spuId:'old',actualLaunch:'2025-01-01'},newOnFirst={spuId:'first',actualLaunch:'2026-10-01'},newMidMonth={spuId:'mid',actualLaunch:'2026-10-02'};
 assert.equal(context.rpRankingGrade(old),'S');
 assert.equal(context.rpRankingGrade(newOnFirst),'S','月初上市且当月完整即可评级');
 assert.equal(context.rpRankingGrade(newMidMonth),'pending');
 assert.match(context.rpRankingGradeMarkup(newMidMonth),/data-rp-grade="pending">待分级/);
 assert.deepEqual(calls,[['2026-10-01','2026-10-31','all'],['2026-10-01','2026-10-31','all']],'完整月评级取全平台，新品不足月不取部分数据');
 cutoff='2026-10-31';assert.equal(context.rpRankingGrade(old),'S','月底截止纳入完整当月');
 cutoff='2026-10-26';assert.equal(context.rpRankingGrade(old),'B','退货成熟区间的截止日只纳入9月');
 assert.deepEqual(calls.at(-1),['2026-09-01','2026-09-30','all']);
 for(const [date,start,end] of [['2027-01-01','2026-12-01','2026-12-31'],['2028-02-29','2028-02-01','2028-02-29']])
  assert.deepEqual({...context.rpRankingGradeMonth(date)},{start,end});
}

export async function drawerGradeOptions(page){
 verifyCompleteMonthGrade();
 // 浏览器返回旧抽屉时，不应保留已取消的筛选值而使产品被静默隐藏。
 const box=vm.createContext({rpListState:{filters:{0:{grade:'unrated'},2:{grade:['S','unrated']},3:{grade:['S']}}},
  pfSelected:value=>Array.isArray(value)?value:value==='all'?[]:[value],rpProduct:row=>row,pfMatches:()=>true,
  rpRankingGrade:()=>{throw new Error('缺货预警榜无需计算等级')}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-filters.js',import.meta.url),'utf8'),box);
 assert.equal(box.rpSavedFilters(0).grade,'all');assert.deepEqual([...box.rpSavedFilters(2).grade],['S']);
 const shortageRows=[{skuId:'sample'}];
 assert.deepEqual(Array.from(box.rpFilterRows(3,shortageRows,{grade:['S']})),shortageRows,'旧等级条件不影响缺货榜结果');
 assert.equal(box.rpSavedFilters(3).grade,'all');
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 let checkedPending=false;
 for(const kind of [0,6,8,4,3,2]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').first().click();
  const grade=page.locator('#dialogbody select[data-rp-filter="grade"]');
  if(kind===3){
   assert.equal(await grade.count(),0);
   assert.equal(await page.locator('#dialogbody [data-rp-grade]').count(),0);
   const rows=await page.evaluate(()=>dashboardRankingGradeSnapshot().rows);
   assert(rows.length>0&&rows.every(row=>row.grade===null),'缺货榜有数据且不判级');
   await page.locator('#close').click();
   continue;
  }
  assert.deepEqual(await grade.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value)),['all','S','A','B','C']);
  assert.equal(await page.locator('#dialogbody [data-rp-grade="unrated"]').count(),0);
  const take=()=>page.evaluate(()=>dashboardRankingGradeSnapshot().rows.map(r=>[r.spuId,r.grade]));
  const original=await take();
  const pending=original.find(([,level])=>level==='pending');
  if(!checkedPending&&pending&&![3,4].includes(kind)){
   const spuCode=await page.evaluate(id=>referenceSampleAudit().spus.find(p=>p.spuId===id).spuCode,pending[0]);
   const query=page.locator('#dialogbody [data-rp-filter="query"]');await query.fill(spuCode);
   assert.equal(await page.locator('#dialogbody [data-rp-grade="pending"]').first().innerText(),'待分级');
   await query.fill('');checkedPending=true;
  }
  const pick=async value=>{
   const menu=page.locator('#dialogbody .pf-multi[data-pf-multi-label="产品分级"]');
   if(await menu.getAttribute('open')===null)await menu.locator(':scope>summary,:scope>[data-pf-multi-trigger]').click();
   await menu.locator('[data-pf-multi-option][value="'+value+'"]').check();
  };
  await pick('S');assert.deepEqual(await take(),original.filter(([,level])=>level==='S'),'筛选使用与徽标相同的完整月等级');
  await pick('all');assert.deepEqual(await take(),original,'全部仍包含原有产品，取消选项不删记录');
  await page.locator('#close').click();
 }
 assert(checkedPending,'样例中至少有一个上市不足完整月的产品显示待分级');
 console.log('通过：完整自然月判级、待分级徽标、产品榜SABC筛选、缺货榜取消分级。');
}
