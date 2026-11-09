import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function reportMakeup(page){
 const ctx=vm.createContext({shiftDate:(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}});
 for(const file of ['02-records.js','03-analysis-model.js','04-analysis-tables.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),ctx);
 assert.equal(ctx.gdReportDeadline('2026-10-31','日报'),'2026-11-01T09:00:00+08:00','日报跨月次日9点');
 assert.equal(ctx.gdReportDeadline('2026-10-19','周报'),'2026-10-26T09:00:00+08:00');
 assert.equal(ctx.gdReportDeadline('2026-10-25','周报'),'2026-10-26T09:00:00+08:00','周日所属周的下一周一');
 assert.equal(ctx.gdReportDeadline('2026-12-31','周报'),'2027-01-04T09:00:00+08:00','周报跨年');
 assert.equal(ctx.gdReportDeadline('2026-09-30','月报'),'2026-10-05T09:00:00+08:00','月报次月5日9点');
 assert.equal(ctx.gdReportDeadline('2026-12-31','月报'),'2027-01-05T09:00:00+08:00','月报跨年');
 assert.equal(ctx.gdReportDeadline('2028-02-29','月报'),'2028-03-05T09:00:00+08:00','闰月也按次月5日');
 assert.equal(ctx.gdReportMakeupStatus({missing:true,syncComplete:true,latestSubmittedAt:'2026-10-05T09:30:00+08:00'}),'是');
 assert.equal(ctx.gdReportMakeupStatus({missing:true,syncComplete:true}),'否');
 assert.equal(ctx.gdReportMakeupStatus({missing:true,syncComplete:false}),'待核实');
 assert.equal(ctx.gdReportMakeupStatus({missing:true,syncComplete:true,latestSubmittedAt:'invalid'}),'待核实');
 await page.clock.setFixedTime(new Date('2026-10-30T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="missing"]').click();
 const table=()=>root.locator('[data-gd-analysis-table="missing"]');
 assert.deepEqual(await table().locator('th').allTextContents(),['人员 / 部门','报告类型','工作日期','应交时间','是否已补交']);
 const daily=(await audit()).reports.find(r=>r.missing&&r.type==='日报');assert(daily);
 assert.match(daily.deadline,/T09:00:00\+08:00$/);
 assert.equal(daily.deadline.slice(0,10),new Date(Date.parse(daily.date+'T00:00:00Z')+86400000).toISOString().slice(0,10));
 assert.equal(await table().locator('[data-report-row="'+daily.id+'"] [data-label="是否已补交"]').innerText(),'否');
 const data=await audit(),missingRows=data.visible;
 assert(missingRows.length>0&&missingRows.every(r=>r.type==='日报'&&r.missing),'台账仅收录已确认未提交的日报');
 assert.equal(await root.locator('[data-gd-report-type]').count(),0,'日报未提交不提供周报/月报筛选');
 assert.match(await root.locator('[data-gd-tab="missing"]').innerText(),/^日报未提交/);
 for(const excluded of data.reports.filter(r=>r.missing&&r.type!=='日报'))assert.equal(await table().locator('[data-report-row="'+excluded.id+'"]').count(),0);
 const card=data.counts.find(r=>r.key==='execution'),count=card.stats.find(([name])=>name==='日报未提交')[1];
 assert.equal(count,missingRows.length);assert.equal(card.count,card.stats.reduce((sum,[,n])=>sum+n,0),'汇总只统计两个实际页签');
 // 模拟后续补交：历史未提交标记保留，周报/月报即使未提交也不进入日报台账。
 const supplemented={...daily,latestSubmittedAt:daily.deadline.replace('T09:00:00','T09:30:00')};
 const scoped=ctx.gdAnalysisRows({reports:[supplemented,{...daily,id:'weekly',type:'周报'},{...daily,id:'monthly',type:'月报'},{...daily,id:'submitted',missing:false}]},'execution','missing');
 assert.equal(scoped.length,1);assert.equal(scoped[0].id,daily.id);
 assert.equal(ctx.gdReportMakeupStatus(scoped[0]),'是');assert(scoped[0].missing,'补交不删除逾期历史');
 await root.locator('#refreshai').click();
 assert.equal((await audit()).counts.find(r=>r.key==='execution').stats.find(([name])=>name==='日报未提交')[1],count);
 await root.locator('[data-gd-search]').fill(daily.owner);assert.equal((await audit()).visible.length,1,'日报台账保留人员搜索');
 await root.locator('[data-gd-search]').fill('');
 await root.locator('[data-gd-tab="quality"]').click();
 assert.equal(await root.locator('[data-gd-report-type]').count(),4,'问题诊断仍支持日报、周报、月报');
 await root.locator('[data-gd-report-type="周报"]').click();assert((await audit()).visible.every(r=>r.type==='周报'&&!r.missing));
 await root.locator('[data-gd-tab="missing"]').click();assert((await audit()).visible.every(r=>r.type==='日报'&&r.missing),'周报筛选不串入日报台账');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1000});assert(await root.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'台账不撑宽页面 '+width);
  if(width>=1024){
   assert(await table().evaluate(t=>{const host=t.parentElement,r=host.getBoundingClientRect(),last=t.tHead.rows[0].cells[4].getBoundingClientRect();return last.width>=80&&last.right<=r.right+1&&host.scrollWidth<=host.clientWidth+1}),'补交列默认可见，不被旧四列宽度挤出 '+width);
  }
 }
 await page.setViewportSize({width:1920,height:1080});await root.screenshot({path:'outputs/report-makeup-1920.png'});
 console.log('通过：日报未提交独立范围、汇总一致、无报告类型筛选、人员搜索、问题诊断周月报不受影响、原截止时间与补交历史规则、宽窄屏。');
}
