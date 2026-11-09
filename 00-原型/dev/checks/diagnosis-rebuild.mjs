import assert from 'node:assert/strict';

// 只验证现用四区入口与只读依据，不再断言已撤销的卡片和评分界面。
export async function diagnosisRebuild(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 assert.deepEqual(await root.locator('#aigrid h3').allTextContents(),['重点工作清单','工作偏差预警','日周报诊断','任务清单']);
 const taskIds=(await audit()).tasks.map(row=>row.task.id).sort();
 for(const part of ['coordination','resource','execution','tasks']){
  await root.locator('[data-gd-part="'+part+'"]').click();
  assert.equal(await root.locator('[data-gd-action="evidence"]').count(),0,'不恢复旧独立依据入口');
  assert.equal(await root.locator('[data-gd-part="closure"]').count(),0);
 }
 await root.locator('[data-gd-part="execution"]').click();
 await root.locator('[data-gd-tab="quality"]').click();
 const data=await audit();
 assert(data.reports.length>0);
 for(const report of data.reports){assert(!Object.hasOwn(report,'score'));assert(!Object.hasOwn(report,'deducted'));}
 assert.equal(await root.locator('.gd-score,.gd-score-summary,[data-gd-rubric]').count(),0);
 await root.locator('[data-gd-action="analysis"]').first().click();
 await page.locator('.gd-analysis-dialog').waitFor();
 assert(await page.locator('[data-gd-report-pane="report"]').count());
 assert(await page.locator('[data-gd-report-pane="sources"]').count());
 assert.equal(await page.locator('[data-gd-evidence]').count(),0);
 assert.deepEqual((await audit()).tasks.map(row=>row.task.id).sort(),taskIds,'查看依据不新增任务');
 console.log('通过：现用四区、无旧入口/评分、报告与来源依据、只读查看不建任务');
}
