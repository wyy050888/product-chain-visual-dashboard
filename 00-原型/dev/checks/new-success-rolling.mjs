import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function verifyRollingModel(){
 const entries=new Map(),calls=[];
 const day=(date,gsv,margin=20)=>({date,gsvCents:gsv*1000000,profitCents:gsv*1000000*margin/100,sales:100,returned:10});
 const a={spuId:'A',actualLaunch:'2026-01-01',days:[day('2026-01-15',60),day('2026-04-15',60),day('2026-07-15',110)]};
 const b={spuId:'B',actualLaunch:'2026-04-01',days:[day('2026-05-01',110)]};
 const c={spuId:'C',actualLaunch:'2025-10-01',days:[day('2025-12-15',60),day('2026-01-15',110)]};
 const d={spuId:'D',actualLaunch:'2026-04-01',days:[day('2026-04-05',110),day('2026-05-01',100,-50)]};
 const ctx={console,DATA_CUTOFF:'2026-10-24',upRuleRevision:0,boundedCache:()=>({get:k=>entries.get(k),set:(k,v)=>(entries.set(k,v),v)}),upIdentity:p=>p,upFactsVersion:()=>({}),pfIdentity:()=>({attribute:'四季品'}),brcNumber:k=>k==='new.exitDays'?30:66,iso:d=>d.toISOString().slice(0,10),shiftDate:(s,n)=>new Date(Date.parse(s)+n*86400000).toISOString().slice(0,10),brcResultMatch:(group,m)=>m.gsv>=(group==='success-year'?500:100)&&m.profitRate>=12&&m.returnRate<=60,
  periodFor:()=>({mode:'quarter',year:2026,value:2}),bounds:p=>{const first=p.mode==='year'?1:(p.value-1)*3+1,last=p.mode==='year'?12:p.value*3,start=p.year+'-'+String(first).padStart(2,'0')+'-01',end=new Date(Date.UTC(p.year,last,0)).toISOString().slice(0,10);return {start,end,cutoff:end<'2026-10-24'?end:'2026-10-24'}},
  upSummary:(p,start,end)=>{assert(start<=end);calls.push({id:p.spuId,start,end});const points=p.days.filter(d=>d.date>=start&&d.date<=end),sum=k=>points.reduce((n,d)=>n+d[k],0),gsvCents=sum('gsvCents'),profitCents=sum('profitCents'),sales=sum('sales'),returned=sum('returned');return {points,gsvCents,profitCents,sales,returned,profitRate:gsvCents?profitCents/gsvCents*100:null,returnRate:sales?returned/sales*100:null}}};
 vm.createContext(ctx);for(const file of ['00-success-approvals.js','01-success.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/new-products/'+file,import.meta.url),'utf8'),ctx);
 const period=(year,q)=>ctx.nspSuccessPeriod({mode:'quarter',year,value:q});
 const q1=ctx.nspSuccessFact(a,period(2026,1)),q2=ctx.nspSuccessFact(a,period(2026,2)),q3=ctx.nspSuccessFact(a,period(2026,3)),q4=ctx.nspSuccessFact(a,period(2026,4));
 assert(q1.included&&!q1.success);assert(q2.included&&q2.carried&&!q2.success,'Q1/Q2各60不合并为120');assert(q3.included&&q3.success);assert(!q4.included&&!q4.success);assert.equal(q3.firstSuccess.quarter,'2026-Q3');assert.equal(q2.firstSuccess,null,'Q2回看不能读取Q3成功');
 const cross=ctx.nspSuccessFact(c,period(2026,1));assert(cross.included&&cross.carried&&cross.success,'跨年未成功继续进入下一年Q1');assert.equal(cross.firstSuccess.quarter,'2026-Q1');
 assert.equal(ctx.nspFirstQuarterSuccess(d,'2026-04-04'),null);assert.equal(ctx.nspFirstQuarterSuccess(d,'2026-04-05').quarter,'2026-Q2','季度未结束即可成功');assert.equal(ctx.nspFirstQuarterSuccess(d,'2026-06-30').date,'2026-04-05','首次确认后保留');
 const annual=ctx.nspSuccessFact(a,ctx.nspSuccessPeriod({mode:'year',year:2026,value:1}));assert(annual.included&&!annual.success&&annual.firstSuccess,'季度成功与年度不成功并存');
 const annualCross=ctx.nspSuccessFact(c,ctx.nspSuccessPeriod({mode:'year',year:2026,value:1}));assert.equal(annualCross.facts.gsvCents,110*1000000,'年度业绩不混入上一年度数据');
 // 年度名单应等于截至查询日当年各季度考核名单的SPU去重并集。
 const pastSuccessful={spuId:'PAST',actualLaunch:'2025-10-01',days:[day('2025-12-31',110),day('2026-01-15',600)]};
 const yearFirst={spuId:'YEAR-FIRST',actualLaunch:'2025-12-01',days:[day('2026-01-01',110)]};
 const rolled={spuId:'ROLLED',actualLaunch:'2025-10-01',days:[day('2025-12-01',60),day('2026-01-15',50),day('2026-04-15',55)]};
 const future={spuId:'FUTURE',actualLaunch:'2026-12-01',days:[day('2026-12-02',600)]};
 const products=[a,b,c,d,pastSuccessful,yearFirst,rolled,future];
 const annualAt=(year,cutoff)=>({...ctx.nspSuccessPeriod({mode:'year',year,value:1}),end:cutoff});
 const quarterAt=(year,q,cutoff)=>{const p=period(year,q),end=new Date(Date.UTC(year,q*3,0)).toISOString().slice(0,10);return {...p,end:end<cutoff?end:cutoff}};
 assert.equal(ctx.nspSuccessFact(pastSuccessful,annualAt(2026,'2026-10-24')).included,false,'往年已成功且当年未参加季度考核，不能进入年度池，即使当年业绩达标');
 assert(ctx.nspSuccessFact(yearFirst,annualAt(2026,'2026-10-24')).included,'当年Q1成功后出池，仍保留在当年年度池');
 assert(!ctx.nspSuccessFact(yearFirst,quarterAt(2026,2,'2026-10-24')).included);
 assert(ctx.nspSuccessFact(rolled,annualAt(2026,'2026-10-24')).included,'往年未成功继续滚入当年季度和年度');
 assert(!ctx.nspSuccessFact(future,annualAt(2026,'2026-10-24')).included,'上市日期晚于截止日，不提前纳入');
 for(const cutoff of ['2026-01-01','2026-03-31','2026-04-01','2026-10-24','2026-12-31','2027-01-15']){
  const year=Number(cutoff.slice(0,4)),annualPeriod=annualAt(year,cutoff);
  const quarterPool=new Set();for(let q=1;q<=4;q++)for(const p of products)if(ctx.nspSuccessFact(p,quarterAt(year,q,cutoff)).included)quarterPool.add(p.spuId);
  const annualRows=[...products,products[0]].map(p=>({...p,successAssessment:ctx.nspSuccessFact(p,annualPeriod)}));
  const annualPool=new Set(annualRows.filter(p=>p.successAssessment.included).map(p=>p.spuId));
  assert.deepEqual([...annualPool].sort(),[...quarterPool].sort(),'年度与季度并集一致：'+cutoff);
  const annualSummary=ctx.nspSuccessSummary(annualRows,annualPeriod);assert.equal(annualSummary.total,quarterPool.size,'年度同SPU只计一次：'+cutoff);
 }
 const rows=[a,b,c].map(p=>({...p,successAssessment:ctx.nspSuccessFact(p,period(2026,2))}));const summary=ctx.nspSuccessSummary([...rows,rows[0]],period(2026,2));assert.equal(summary.total,2);assert.equal(summary.success,1);assert.equal(summary.rate,50);assert.equal(rows.filter(p=>p.successAssessment.included&&!p.successAssessment.success).length,1);
 assert.equal(ctx.nspPoolExitDate(['2026-Q3']),'2026-10-30');assert(calls.some(c=>c.id==='A'&&c.start==='2026-04-01'),'Q2取当季区间');
 return {ctx,products:{a,b,c,d,rolled,pastSuccessful,future},period,annualAt,quarterAt};
}
export async function newSuccessRolling(page){
 verifyRollingModel();
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const before=await page.evaluate(()=>dashboardNewProductsSnapshot());
 assert.equal(await page.locator('#time-new .metric-help').count(),0,'不恢复已删除的时间问号');
 assert.equal(await page.locator('#newtable th').nth(5).innerText(),'是否成功');
 for(const row of before.visible.slice(0,10)){const cell=page.locator('#newtable tbody tr').filter({has:page.locator('[data-nsp-view="'+row.spuId+'"]')}).locator('td').nth(5);assert.equal(await cell.innerText(),row.successQuarters.length?'成功':'不成功')}
 await page.locator('[data-nsp-assessment="all"]').first().click();
 await page.locator('.nsp-assessment').waitFor();
 let data=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());assert.equal(data.rows.length,before.success.total);assert.equal(data.summary.success,before.success.success);
 const total=data.rows.length,success=data.summary.success;
 await page.locator('[data-nsp-assess-result="success"]').click();assert.equal(await page.locator('[data-nsp-assessment-table] tbody tr:has([data-nsp-assess-product])').count(),Math.min(10,success));
 await page.locator('[data-nsp-assess-result="success"]').focus();await page.keyboard.press('ArrowRight');assert.equal((await page.evaluate(()=>dashboardNewProductAssessmentSnapshot())).result,'failure');assert.equal(await page.locator('[data-nsp-assessment-table] tbody tr:has([data-nsp-assess-product])').count(),Math.min(10,total-success));
 await page.locator('[data-nsp-assess-result="all"]').click();
 await page.locator('[data-nsp-assess-kind="year"]').click();data=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());assert(data.assessment.annual);
 assert.deepEqual(await page.locator('[data-nsp-assess-results] [role=tab]').evaluateAll(tabs=>tabs.map(tab=>tab.dataset.nspAssessResult)),['all','success','failure']);assert.equal(await page.locator('[data-nsp-assess-quarter]').count(),0,'时间控件不再包含季度下拉');
 const annualPool=new Set(data.rows.map(r=>r.spuId)),quarterPool=new Set();
 assert.equal(data.summary.total,24,'当前2026样例年度池仍为24款');const rules=await page.evaluate(()=>businessRuleConfigSnapshot().values);
 const annualExpected=data.rows.filter(row=>{const f=row.successAssessment.facts,year=Number(data.assessment.start.slice(0,4)),start=Math.max(Date.parse(row.actualLaunch+'T00:00:00Z'),Date.UTC(year,0,1)),end=Date.UTC(year+1,0,1),ratio=(end-start)/(end-Date.UTC(year,0,1)),target=rules[row.season==='四季品'?'new.yearGsv':'new.seasonGsv']*1000000*ratio;return f.gsvCents>=target&&f.profitRate>=rules['new.profit']&&f.returnRate<=rules['new.return']}).length;
 assert.equal(data.summary.success,annualExpected,'年度按每个产品的上市周期独立折算，不固定成功款数');
 await page.locator('[data-nsp-assess-kind="quarter"]').click();
 for(const q of [1,2,3,4]){await page.locator('[data-nsp-assess-matrix="'+q+'"][data-nsp-assess-chain="all"][data-nsp-assess-pool="all"]').first().click();const quarter=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());quarter.rows.forEach(r=>quarterPool.add(r.spuId))}
 assert.deepEqual([...annualPool].sort(),[...quarterPool].sort(),'页面年度名单与当年季度名单去重并集一致');
 await page.locator('[data-nsp-assess-matrix="3"][data-nsp-assess-chain="all"][data-nsp-assess-pool="all"]').first().click();data=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());assert(data.rows.every(r=>r.successAssessment.included));assert(data.rows.every(r=>!r.successAssessment.firstSuccess||r.successAssessment.firstSuccess.date<=data.assessment.end));
 await page.locator('#close').click();assert.deepEqual((await page.evaluate(()=>dashboardNewProductsSnapshot())).period,before.period);
 await page.locator('#time-new [data-time-mode="year"]').click();assert.equal(await page.locator('#newtable th').nth(5).innerText(),'是否成功');assert.equal(await page.locator('#newtable th').nth(6).innerText(),'年度是否成功');
 const entry=page.locator('#newtop [data-nsp-assessment-entry]');assert.equal(await entry.innerText(),'查看年度考核');
 const annualBefore=await page.evaluate(()=>dashboardNewProductsSnapshot());await entry.click();data=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());
 assert.equal(data.period.mode,'year');assert.equal(data.period.year,annualBefore.period.year);assert.equal(data.summary.total,annualBefore.success.total);assert.equal(data.summary.success,annualBefore.success.success);assert.equal(await page.locator('[data-nsp-assess-quarter]').count(),0);await page.locator('#close').click();
 const annualHelp=page.locator('#newtop [data-nsp-kpi="新品销售成功率"]');assert.equal(await annualHelp.getAttribute('data-nsp-annual'),'true');await annualHelp.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForTimeout(120);await annualHelp.hover();await page.waitForFunction(()=>!document.querySelector('#metric-tooltip').hidden);assert.match(await page.locator('#metric-tooltip .nsp-tip-heading h4').innerText(),/年度/);assert.match(await page.locator('#metric-tooltip .nsp-tip-formula').innerText(),/年度成功数/);assert.match(await page.locator('#metric-tooltip').innerText(),/全年GSV门槛×当年上市日至12月31日/);await page.mouse.move(0,0);
 const annualRows=await page.evaluate(()=>dashboardNewProductsSnapshot());for(const row of annualRows.visible.slice(0,10)){const cells=page.locator('#newtable tbody tr').filter({has:page.locator('[data-nsp-view="'+row.spuId+'"]')}).locator('td');assert.equal(await cells.nth(5).innerText(),row.successQuarters.length?'成功':'不成功');assert.equal(await cells.nth(6).innerText(),!row.successAssessment.included?'未纳入':row.salesSuccess?'成功':'不成功')}
 for(const mode of ['month','day']){await page.locator('#time-new [data-time-mode="'+mode+'"]').click();assert.equal(await entry.innerText(),'查看季度考核');await entry.click();assert.equal((await page.evaluate(()=>dashboardNewProductAssessmentSnapshot())).period.mode,'quarter');await page.locator('#close').click()}
 // 跨年后上一年Q4成功但尚未到30天出池日的产品，主表可见但不参加新年度考核。
 await page.clock.setFixedTime(new Date('2027-01-15T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#new"]').click();await page.locator('#time-new [data-time-mode="year"]').click();
 const nextYear=await page.evaluate(()=>dashboardNewProductsSnapshot()),excluded=nextYear.filtered.filter(r=>r.inNewPool&&!r.successAssessment.included);
 assert(excluded.length,'跨年样例包含仍在主表但不纳入年度的往年成功产品');
 for(const row of excluded){await page.locator('[data-nsp-search]').fill(row.spuCode);const cells=page.locator('#newtable tbody tr').filter({has:page.locator('[data-nsp-view="'+row.spuId+'"]')}).locator('td');assert.equal(await cells.nth(5).innerText(),'成功');assert.equal(await cells.nth(6).innerText(),'未纳入')}
 await page.locator('[data-nsp-search]').fill('');await page.locator('[data-nsp-assessment-entry]').click();
 const annualNext=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());assert(annualNext.rows.every(r=>!r.successAssessment.firstSuccess||r.successAssessment.firstSuccess.date>='2027-01-01'),'年度抽屉排除往年已成功产品');assert(excluded.every(r=>!annualNext.rows.some(v=>v.spuId===r.spuId)));
 await page.locator('[data-nsp-assess-kind="quarter"]').click();const q1=await page.evaluate(()=>dashboardNewProductAssessmentSnapshot());assert.deepEqual(annualNext.rows.map(r=>r.spuId).sort(),q1.rows.map(r=>r.spuId).sort(),'1月年度池只包含截至当日Q1纳入产品');await page.locator('#close').click();

}
