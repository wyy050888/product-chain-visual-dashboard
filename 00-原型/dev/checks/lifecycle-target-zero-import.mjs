import assert from 'node:assert/strict';

// 验证真实导入流程保留零目标和缺失目标，及整批失败不写入。
export async function lifecycleTargetZeroImport(page){
 const key='lifecycle-quarter-targets-v1',previous=await page.evaluate(key=>localStorage.getItem(key),key);
 const snapshot=()=>page.evaluate(()=>lifecycleTargetsAudit().saved);
 const row=(q1,q2='')=>[2026,'环境','自研上品计划',q1,q2,'',''];
 const upload=rows=>page.locator('#lt-import-file').setInputFiles({name:'目标.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+[['年度','链群','计划','Q1','Q2','Q3','Q4'],...rows].map(r=>r.join(',')).join('\r\n'))});
 const open=()=>page.locator('[data-lt-import]').click();
 const commit=async()=>{await page.locator('#lt-import-confirm').click();await page.locator('#lt-import-dialog').waitFor({state:'hidden'})};
 try{
  await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload();
  await page.locator('#lt-open-targets').evaluate(element=>element.click());await page.locator('#lt-year').selectOption('2026');
  const actuals=await page.evaluate(()=>lifecycleTargetsAudit().sourceActuals);
  const before=await snapshot();
  await open();await upload([row(30,0),row(-1)]);await page.locator('#lt-import-confirm').click();
  await page.locator('.ui-import-feedback.is-error').waitFor();
  assert.deepEqual(await snapshot(),before,'失败整批不修改目标');
  await page.locator('.ui-import-feedback button').click();
  assert.match(await page.locator('[data-ui-history-content]').innerText(),/整数/);
  await page.locator('[data-ui-history-close]').first().click();
  await upload([row(30,0)]);await commit();
  assert.deepEqual((await snapshot()).years[2026].values[0][0],[30,0,18,18],'导入0更新为零目标，空白保留旧值');
  assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'66');
  await page.locator('[data-lt-number="0:1"]').fill('');
  assert.equal((await snapshot()).years[2026].values[0][0][1],null);
  await open();await upload([row(31)]);await commit();
  assert.deepEqual((await snapshot()).years[2026].values[0][0],[31,null,18,18],'导入空白保留旧null');
  assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'—');
  await open();await upload([row('',0)]);await commit();
  assert.deepEqual((await snapshot()).years[2026].values[0][0],[31,0,18,18]);
  assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'67');
  assert.deepEqual(await page.evaluate(()=>lifecycleTargetsAudit().sourceActuals),actuals);
  const saved=await snapshot();await page.reload();assert.deepEqual(await snapshot(),saved,'刷新保留0与null');
 }finally{
  await page.evaluate(({key,previous})=>{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous)},{key,previous});
 }
}
