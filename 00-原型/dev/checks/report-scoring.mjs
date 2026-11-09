import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const displayTerms=vm.runInNewContext(readFileSync(new URL('../../src/modules/page-presentation/03-terminology.js',import.meta.url),'utf8').split('function formatDisplayedTerms')[0]+'\npresentationTermText');
function verifyDiagnosisModel(){
 const context=vm.createContext({});
 for(const file of ['03-report-employee-rubrics.js','03-report-rubrics.js','03-report-deduction-rules.js','03-report-scoring.js'])vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),context);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
 const profiles=run('Object.values(gdReportProfileCatalog).flatMap(c=>[c.director,...c.employees])');
 assert.equal(profiles.length,25);
 for(const profile of profiles){
  vm.runInContext('globalThis.testProfile='+JSON.stringify(profile),context);
  for(const row of profile.rows){
   vm.runInContext('globalThis.testRow='+JSON.stringify(row),context);
   const rules=run('gdReportIssueRules(testProfile,testRow[0])');assert(rules.length&&rules.every(r=>r.id&&r.label&&!Object.hasOwn(r,'points')));
   const diagnose=issues=>run('gdDiagnoseReportCheck(testProfile,testRow,"原文",'+JSON.stringify(issues)+')');
   assert.equal(diagnose([]).passed,true);
   const issue={ruleId:rules[0].id,problem:'已核实问题'},result=diagnose(Array(30).fill(issue));
   assert.equal(result.issues.length,1,'同一问题只记录一次');assert.equal(result.passed,false);
   for(const key of ['earned','loss','weight','score'])assert(!Object.hasOwn(result,key),'诊断不包含分值');
   assert.throws(()=>diagnose([{ruleId:'unknown',problem:'问题'}]),/无效报告诊断细项/);
   assert.throws(()=>diagnose([{ruleId:rules[0].id,problem:''}]),/无效报告诊断细项/);
  }
 }
}
// 保留历史检查命令名，当前验证问题诊断而非评分。
export async function reportScoring(page){
 verifyDiagnosisModel();
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const audit=await page.evaluate(()=>globalDiagnosisAudit()),reports=audit.reports;
 assert.equal(reports.length,15);assert.equal(reports.filter(r=>r.missing).length,3);assert(!Object.hasOwn(audit,'scores'));
 assert.equal(reports.filter(r=>!r.missing&&!r.findings.length).length,4,'正常报告保留无问题状态');
 assert.equal(await root.locator('[data-gd-rubric],.gd-score-summary,.gd-score').count(),0);
 assert.deepEqual(await root.locator('.quality th').allTextContents(),['人员 / 部门','报告类型','工作日期','问题说明','操作']);
 for(const report of reports){
  assert(!Object.hasOwn(report,'score'));
  if(report.missing){assert.deepEqual(report.checks,[]);continue}
  assert.equal(report.content,report.sources[0].content);assert.equal(report.findings.length,report.checks.filter(c=>!c.passed).length);
  for(const check of report.checks){assert.equal(check.passed,check.issues.length===0);for(const key of ['weight','earned','loss'])assert(!Object.hasOwn(check,key))}
 }
 const examples=[reports.find(r=>r.department==='品质中心'&&r.type==='日报'),reports.find(r=>r.department==='产品中心'&&r.type==='月报'),reports.find(r=>r.department==='采购部'&&r.type==='日报')];
 for(const report of examples){
  await root.locator('[data-gd-search]').fill(report.owner);
  const row=root.locator('[data-report-row="'+report.id+'"]');assert.equal(await row.locator('td').count(),5);
  assert.equal(await row.locator('.gd-report-finding b').count(),0,'问题前无扣分数字');
  await row.locator('td:last-child button').click();
  const drawer=page.locator('.gd-report-dialog');assert.equal(await page.locator('.gd-report-score-banner,.gd-applied-rubric,[data-gd-rubric]').count(),0);
  const table=drawer.locator('[aria-label="报告问题诊断"]');
  if(!report.findings.length)assert.equal((await drawer.locator('[data-gd-report-pane="report"]').innerText()).trim(),'未发现内容问题');
  else{
   assert.deepEqual(await table.locator('th').allTextContents(),['诊断项','问题说明','对应原文']);
   for(const check of report.checks.filter(c=>!c.passed)){
    const cells=table.locator('[data-gd-diagnosis-key="'+check.key+'"] td');assert.equal(await cells.count(),3);
    assert.equal(await cells.nth(1).locator('.gd-report-issue').count(),check.issues.length);
    for(const item of check.issues){assert((await cells.nth(1).innerText()).includes(displayTerms(item.problem)));assert((await cells.nth(2).innerText()).includes(displayTerms(item.excerpt)))}
   }
  }
  for(const width of [1920,390]){await page.setViewportSize({width,height:1000});const box=await page.locator('#dialog').boundingBox();assert(box.x>=-1&&box.x+box.width<=width+1)}
  await page.setViewportSize({width:1920,height:1000});await page.locator('#drawer-tabs [data-drawer-tab="sources"]').click();
  assert.equal((await page.locator('[data-gd-report-pane="sources"] tbody td:last-child').textContent()).replace(/\s+/g,''),displayTerms(report.content.replace(/\b20(\d{2})-(\d{2})-(\d{2})\b/g,'$1/$2/$3')).replace(/\s+/g,''));
  await page.locator('#close').click();
 }
 await root.locator('[data-gd-search]').fill('');
 console.log('通过：报告及部门不计分、无评分入口/卡片/扣分值，问题去重、正常对照、问题原文分列及宽窄屏。');
}
