import assert from 'node:assert/strict';
import {assertPreviewButtonClear} from './preview-geometry.mjs';
import {fileURLToPath} from 'node:url';

export async function reportProblemPreview(page){
 const root=page.locator('#ai'),tip=page.locator('#ui-cell-tooltip');
 await page.emulateMedia({reducedMotion:'reduce'});
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const before=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports));
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1000});await root.locator('[data-gd-search]').fill('林悦');
  const row=root.locator('[data-report-row^="diagnosis-report-0-0|"]'),cell=row.locator('[data-label="问题说明"]');
  const preview=cell.locator('[data-ui-cell-content]'),button=cell.locator('[data-gd-cell-more]');
  await button.waitFor({state:'visible'});
  const full=await preview.innerText(),height=(await row.boundingBox()).height;
  assert.equal(await cell.locator('.gd-report-finding').count(),4,'保留全部问题节点');
  assert.equal(await preview.evaluate(e=>e.clientHeight),66,'默认最多三行');
  assert.equal(await preview.evaluate(e=>getComputedStyle(e).webkitLineClamp),'3');
  assert.equal(await button.innerText(),'展开');assert.equal(await button.getAttribute('aria-expanded'),'false');
  assert.equal(await button.getAttribute('aria-controls'),await preview.getAttribute('id'));
  assert.match(await button.evaluate(e=>getComputedStyle(e,'::before').content),/…/,'收起时有省略号提示');
  if(width===1920){
   const tail=await cell.locator('.gd-report-finding').nth(2).locator('span').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const r=[...range.getClientRects()].at(-1);return {right:r.right,top:r.top,bottom:r.bottom}});
   const box=await button.boundingBox();assert(box.x>=tail.right+2&&box.x<=tail.right+12,'展开紧跟第三行文字，而非列最右侧');
   assert(Math.abs(box.y+box.height/2-(tail.top+tail.bottom)/2)<5,'入口与末行同排');
   await root.locator('.gd-analysis-table.quality').screenshot({path:fileURLToPath(new URL('../../outputs/report-inline-tail-closed.png',import.meta.url))});
  }
  assert.equal(await root.locator('[data-report-row^="diagnosis-report-0-2|"]').count(),0,'无问题报告不进入问题列表');
  await button.click();assert.equal(await button.innerText(),'收起');
  await assertPreviewButtonClear(preview);
  assert((await row.boundingBox()).height>height,'完整问题在原行撑高');
  assert(await preview.evaluate(e=>e.scrollHeight<=e.clientHeight+1),'全文完整显示');
  assert.equal(await preview.innerText(),full);assert.equal(await root.locator('.gd-task-cell.is-expanded').count(),1);
  const last=await cell.locator('.gd-report-finding').last().locator('span').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const r=[...range.getClientRects()].at(-1);return {right:r.right,top:r.top,bottom:r.bottom}});
  const openBox=await button.boundingBox(),previewBox=await preview.boundingBox();
  if(last.right+52<=previewBox.x+previewBox.width)assert(openBox.x>=last.right+2&&openBox.x<=last.right+12,'收起紧跟最后一条文字');
  else assert(openBox.y>=last.bottom&&Math.abs(openBox.x-previewBox.x)<1,'末行放不下时在下一行左侧收起');
  assert.equal(await button.evaluate(e=>getComputedStyle(e,'::before').display),'none','展开后不保留省略号');
  if(width===1920)await root.locator('.gd-analysis-table.quality').screenshot({path:fileURLToPath(new URL('../../outputs/report-inline-tail-open.png',import.meta.url))});
  assert(await tip.isHidden(),'不叠加原文浮层');
  await button.click();assert((await row.boundingBox()).height<=height+1,'收起恢复行高');
  await button.focus();await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Space');assert.equal(await button.getAttribute('aria-expanded'),'false');
  await root.locator('[data-gd-search]').fill('');
 }
 await page.setViewportSize({width:1920,height:1000});
 const row=root.locator('[data-report-row^="diagnosis-report-0-0|"]'),button=row.locator('[data-gd-cell-more]');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const duration=await button.evaluate(button=>{
  button.click();const animation=button.closest('.gd-task-cell').getAnimations()[0];
  if(!animation)return 0;const duration=animation.effect.getTiming().duration;animation.finish();return duration;
 });
 assert.equal(duration,240,'沿用任务表展开动画');
 await page.waitForFunction(()=>!document.querySelector('.gd-task-cell.is-transitioning'));
 await row.locator('td:last-child button').click();assert(await page.locator('.gd-report-dialog').isVisible());
 await page.locator('#close').click();
 await root.locator('[data-gd-report-type="月报"]').click();await root.locator('[data-gd-report-type="all"]').click();
 assert.equal(await root.locator('.gd-task-cell.is-expanded').count(),0,'筛选重绘恢复收起');
 await root.locator('[data-gd-tab="missing"]').click();assert.equal(await root.locator('.gd-task-preview').count(),0,'不影响未提交台账');
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports)),before,'展开收起不改问题及原文');
 console.log('通过：报告问题说明三行上限、真实截断入口、展开收起/键盘/240ms动画、三种宽度、报告入口及未提交隔离，数据保持。');
}
