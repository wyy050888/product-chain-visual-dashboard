import assert from 'node:assert/strict';
export async function rankingsWithoutTrends(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('#riskrail [data-risk="0"]').click();
 let checked=0;
 for(const kind of [0,6,1,4,3,2]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  const host=page.locator('.rp-list-table');await host.waitFor();
  assert.equal(await host.locator('[data-rp-trend],.rp-mini-trend,.rp-trend-heading,.rp-trend-empty').count(),0,'榜单 '+kind+' 无趋势列');
  assert.equal(await page.locator('#rp-trend-tooltip').count(),0,'专用浮层也已删除');
  if(!await host.locator('table').count())continue;
  checked++;
  const headers=await host.locator('th').allTextContents();assert.equal(headers.at(-1).trim(),'操作');assert(!headers.some(text=>/近7日|趋势/.test(text)));
  assert(await host.locator('tbody tr').evaluateAll((rows,n)=>rows.every(row=>row.cells.length===n),headers.length),'表头和数据列对齐');
  const sort=host.locator('[data-rp-sort]').first();await sort.click();
  assert(await host.locator('tbody tr').count()>0,'排序后仍有数据');
  assert.equal(await host.locator('.rp-mini-trend').count(),0,'重绘不恢复趋势');
  const pager=page.locator('#rp-list-pagination');assert(await pager.isVisible());
  await host.evaluate(element=>element.scrollLeft=element.scrollWidth);
  const operation=host.locator('tbody tr').first().locator('td').last();
  assert.equal(await operation.locator('button').count(),1,'查看操作保留');
 }
 assert(checked>=4,'至少核对四个有数据的榜单');
 await page.locator('#close').click();
 console.log('通过：六个完整榜单无趋势列，表头与行对齐，排序、分页和查看入口保留。');
}
