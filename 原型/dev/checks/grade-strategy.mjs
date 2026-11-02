import assert from 'node:assert/strict';
import {clearKeyProductFilters} from './key-products-default-filters.mjs';
// 升降入口移至六卡；只有一个异动条件，明细取交集，矩阵保留完整基础范围。
export async function gradeStrategy(page){
 await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot()),ids=rows=>rows.map(p=>p.spuId).sort();
 const initial=await snapshot(),counts=await root.locator('.kpm-structure-count').allTextContents();
 assert.equal(await root.locator('[data-kpm-management-section=changes],#matrix-ai-summary,.kpm-management-row').count(),0);
 assert.deepEqual(await root.locator('.kpm-structure-title').allTextContents(),['等级上升','等级下降','S级产品','A级产品','B级产品','C级产品']);
 for(const kind of ['up','down']){
  const button=root.locator('[data-kpm-summary-change='+kind+']'),expected=initial.base.filter(p=>p.assessment.change===kind);
  assert.equal(Number(await button.locator('.kpm-structure-count').innerText()),expected.length);
  await button.click();let state=await snapshot();assert.equal(state.change,kind);assert.equal(state.page,1);assert.deepEqual(ids(state.visible),ids(expected));
  assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await root.locator('#matrixchart circle').count(),initial.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length);
  assert.deepEqual(await root.locator('.kpm-structure-count').allTextContents(),counts);assert(await page.locator('#overlay').isHidden());
  await root.locator('[data-kpm-expand]').click();const zoom=root.locator('.kpm-chart-zoom');await zoom.waitFor();
  assert.deepEqual(ids((await page.evaluate(()=>dashboardKeyProductZoomSnapshot())).rows),ids(initial.base));
  await zoom.locator('[data-kpm-expand]').click();assert.equal((await snapshot()).change,kind);
  await button.click();assert.equal((await snapshot()).change,'all');
 }
 await root.locator('[data-kpm-summary-change=up]').click();await root.locator('[data-kpm-summary-change=down]').click();assert.equal((await snapshot()).change,'down');assert.equal(await root.locator('[data-kpm-summary-change][aria-pressed=true]').count(),1);
 await root.locator('[data-kpm-grade=A]').click();assert.equal((await snapshot()).change,'all');assert.equal((await snapshot()).grade,'A');
 await root.locator('[data-kpm-change=up]').click();assert.equal((await snapshot()).grade,'A');assert((await snapshot()).visible.every(p=>p.level==='A'&&p.assessment.change==='up'),'下方条件仍支持交集');
 await clearKeyProductFilters(page);
 const brand=initial.rows[0].brand;await root.locator('[data-kpm-filter=brand]').selectOption([brand],{force:true});await root.locator('[data-kpm-summary-change=down]').click();
 assert((await snapshot()).visible.every(p=>p.brand===brand&&p.assessment.change==='down'));
 await root.locator('[data-time-mode=quarter]').click();assert.equal((await snapshot()).change,'down');assert((await snapshot()).visible.every(p=>p.assessment.change==='down'));
 await root.locator('[data-time-mode=recent30]').click();await clearKeyProductFilters(page);
}
