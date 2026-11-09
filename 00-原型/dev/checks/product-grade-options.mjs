import assert from 'node:assert/strict';

export async function productGradeOptions(page) {
  await page.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'ready');
  await page.locator('a[href="#new"]').click();
  const tabs = page.locator('#nsp-grade-tabs [data-nsp-grade]');
  assert.deepEqual(await tabs.evaluateAll(nodes => nodes.map(node => node.dataset.nspGrade)), ['all', 'S', 'A', 'B', 'C']);
  const legend = page.locator('#newtop .nsp-distribution .dp-legend [data-nsp-grade]');
  assert.deepEqual(await legend.evaluateAll(nodes => nodes.map(node => node.dataset.nspGrade)), ['S', 'A', 'B', 'C']);
  const initial = await page.evaluate(() => dashboardNewProductsSnapshot());
  const counts = await legend.locator('b').allTextContents();
  assert.equal(counts.reduce((total, value) => total + Number(value.replace('个', '')), 0), initial.visible.length);
  const grade = initial.visible.find(row => row.grade)?.grade;
  assert(grade);
  await page.locator('#nsp-grade-tabs [data-nsp-grade="' + grade + '"]').click();
  assert((await page.evaluate(() => dashboardNewProductsSnapshot())).visible.every(row => row.grade === grade));
  await page.locator('#nsp-grade-tabs [data-nsp-grade=all]').click();
  assert.equal((await page.evaluate(() => dashboardNewProductsSnapshot())).visible.length, initial.visible.length);
  assert.doesNotMatch(await page.locator('#new').innerText(), /未分级/);

  await page.locator('a[href="#matrix"]').click();
  const chart = page.locator('#matrixchart'), matrixLegend = page.locator('#matrix .kpm-chart-legend');
  assert.deepEqual(await matrixLegend.locator(':scope > span').allTextContents(), ['S级', 'A级', 'B级', 'C级']);
  assert.doesNotMatch(await chart.locator('svg').getAttribute('aria-label'), /未分级/);
  const points = await chart.locator('[data-kpm-point]').count();
  await page.locator('#matrix [data-kpm-expand]').click();
  assert(await page.locator('#matrix .kpm-chart-zoom').isVisible());
  assert.doesNotMatch(await page.locator('.kpm-chart-zoom .kpm-chart-legend').innerText(), /未分级/);
  assert.equal(await chart.locator('[data-kpm-point]').count(), points, '清理图例不删除产品点');
  await page.keyboard.press('Escape');
}
