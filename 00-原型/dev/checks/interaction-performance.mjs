import assert from 'node:assert/strict';

export async function interactionPerformance(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 const text=selector=>page.locator(selector).evaluate(node=>node.textContent.replace(/\s+/g,' ').trim());
 const connected=handle=>handle.evaluate(node=>node.isConnected);
 await page.locator('#risk [data-time-mode="year"]').click();await page.locator('#risk [data-time-year]').selectOption('2025');
 const stock=await page.locator('#riskrail [data-rp-board="4"]').elementHandle(),loss=await page.locator('#riskrail [data-rp-board="2"]').elementHandle();
 await page.locator('[data-rp-card-platform="0"]').selectOption('快手',{force:true});await settle();
 assert(await connected(stock));assert(await connected(loss),'品质平台切换不重建库存和亏损榜');
 const partial=await text('#risk');await page.locator('#risk [data-time-year]').selectOption('2025');await settle();
 assert.equal(await text('#risk'),partial,'局部刷新必须与同条件完整刷新相同');
 const quality=await page.locator('#riskrail [data-rp-board="0"]').elementHandle();
 await page.locator('[data-rp-card-season="4"]').selectOption('冬季品',{force:true});await settle();assert(await connected(quality));
 const season=await text('#risk');await page.locator('#risk [data-time-year]').selectOption('2025');await settle();assert.equal(await text('#risk'),season);
 await page.locator('a[href="#suppliers"]').click();
 const project=await page.locator('.scp-project-card').elementHandle(),material=await page.locator('.scp-material-layout').elementHandle();
 await page.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2025');await settle();
 assert(await connected(project));assert(await connected(material),'资源池年份不能重算其他供应商表');
 assert.equal((await page.evaluate(()=>window.supplierPlanningAudit())).annual.range.start,'2025-01-01');
 const resources=await page.locator('.scp-resource-card').elementHandle();
 await page.locator('[data-scp-query="project"]').fill('取暖');await settle();assert(await connected(resources));
 assert.equal(await page.locator('[data-scp-query="project"]').inputValue(),'取暖');assert(await page.locator('[data-scp-query="project"]').evaluate(node=>node===document.activeElement));
 // 不同查询可得到同一空结果；保留未变化的图形，清空搜索后仍恢复真实数据。
 await page.locator('a[href="#new"]').click();await page.locator('[data-nsp-search]').fill('无此产品甲');await settle();
 const overview=await page.locator('#newtop svg').first().elementHandle();
 await page.locator('[data-nsp-search]').fill('无此产品乙');await settle();assert(await connected(overview),'相同概览不重建SVG');
 await page.locator('[data-nsp-search]').fill('');await settle();assert((await page.evaluate(()=>window.dashboardNewProductsSnapshot())).rows.length>0);
 await page.locator('a[href="#matrix"]').click();await page.locator('[data-kpm-search]').fill('无此产品甲');await settle();
 const chart=await page.locator('#matrixchart svg').elementHandle();
 await page.locator('[data-kpm-search]').fill('无此产品乙');await settle();assert(await connected(chart));
 await page.locator('[data-kpm-search]').fill('');await settle();
 await page.setViewportSize({width:1280,height:900});await settle();
 assert(await page.locator('#matrixchart').evaluate(host=>Math.abs(Number(host.querySelector('svg').getAttribute('viewBox').split(' ')[2])-host.clientWidth)<2),'保留SVG后实际尺寸变化仍由ResizeObserver重排');
 console.log('期间/局部筛选结果、节点复用、搜索焦点与图表缩放一致');
}
