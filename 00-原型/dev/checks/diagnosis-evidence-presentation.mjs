import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function diagnosisEvidencePresentation(page){
 await page.clock.setFixedTime(new Date('2026-11-06T02:30:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const box=vm.createContext({esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),document:{addEventListener(){}},gdSourceDate:s=>String(s||'').slice(0,10),gdAnalysisSourceTable:()=>'<table>原依据</table>'});
 for(const name of ['02-action-summary','04-readable-text','04-action-table'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+name+'.js',import.meta.url),'utf8'),box);
 const unit=vm.runInContext(`(()=>{
  const participants=[{assignee:'甲',action:'核实呆滞品退厂、返工或清仓承接条件，记录数量及处置日期。'},{assignee:'乙',action:'核实尾货适销平台与清仓节奏，反馈价格底线。'}];
  return gdParticipantAdvice(participants);
 })()`,box);
 assert.equal((unit.match(/class="gd-action-summary"/g)||[]).length,1);assert(unit.includes('【落实库存处理方案】'));assert(unit.includes('甲：'));assert(unit.includes('乙：'));
 await page.locator('a[href="#ai"]').click();await page.locator('[data-gd-part="resource"]').click();await page.locator('[data-gd-tab="omission"]').click();
 const row=page.locator('[data-gd-deviation]').first();assert(await row.count());assert(await row.locator('[data-label="行动建议"] .gd-action-summary').count());
 const before=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().deviations.map(x=>[x.id,x.participants,x.sources])));
 await row.locator('[data-gd-action="analysis"]').click();
 const drawer=page.locator('.gd-analysis-dialog');assert(await drawer.locator('.gd-action-summary').count());assert(await drawer.locator('table[aria-label="来源与内容"]').count());
 const history=drawer.locator('[data-ai-finding-history]');assert(await history.count());const text=await history.innerText();
 assert(text.includes('来源依据与跟进'));assert.equal(await history.locator('.gd-follow-meta').count(),0,'不展示重复汇总行');assert(await history.locator('table[aria-label="问题跟进记录"]').count());
 assert(!/T\d{2}:\d{2}:\d{2}|状态与历史依据|1版/.test(text),'不展示技术时间或无变化版本');
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/02-global.js',import.meta.url),'utf8'),box);
 box.aiHistoryStream=()=>box.stream;box.gdProblemText=row=>row.problem||'';
 const historic=vm.runInContext(`(()=>{
  const row={id:'r',historyKey:'r',problem:'原问题',sources:[],lifecycle:{status:'跟进中'}};
  const mk=(date,problem)=>({date,knownAt:date+'T03:00:00Z',payload:{work:[],reports:[],deviations:[{...row,problem}],findingStates:{r:{status:'跟进中',reason:'跟进原事项'}}}});
  globalThis.stream={revisions:[mk('2026-11-04','原问题'),mk('2026-11-05','原问题'),mk('2026-11-06','新增复核进展')]};
  return gdHistoryEvidence(row);
 })()`,box);
 assert(historic.includes('报告诊断跟进记录')&&historic.includes('新增复核进展'),'同一内容不重复记录，实际进展以表格回看');
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().deviations.map(x=>[x.id,x.participants,x.sources]))),before,'展示不修改真实分工及依据');
 await page.locator('#close').click();
}
