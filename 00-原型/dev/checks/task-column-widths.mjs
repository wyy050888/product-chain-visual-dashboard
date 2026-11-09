import assert from 'node:assert/strict';

export async function taskColumnWidths(page){
 const old=[112,80,96,112,260,300,360,88,112,112,112,104,128,128,80];
 await page.evaluate(old=>localStorage.setItem('dashboard-column-widths-v1',JSON.stringify({'gd-ledger-columns-v1':old,'gd-ledger-columns-v2':[112,80,96,112,300,340,650,88,112,112,112,104,128,128,80],'unrelated-table':[90,100]})),old);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),table=()=>root.locator('[data-gd-table]');await root.locator('[data-gd-part=tasks]').click();
 const widths=()=>table().locator('th').evaluateAll(nodes=>nodes.slice(4,7).map(n=>Math.round(n.getBoundingClientRect().width)));
 await table().locator('[data-ui-column-handle]').first().waitFor();assert.deepEqual(await widths(),[300,340,520],'保存过旧列宽也采用新布局');
 assert.equal(await table().getAttribute('data-column-key'),'gd-ledger-columns-v3');
 const handle=table().locator('th').nth(6).locator('[data-ui-column-handle]');await handle.focus();await page.keyboard.press('ArrowRight');assert.deepEqual(await widths(),[300,340,528],'新版列宽仍可手动调整');
 const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-column-widths-v1')));assert.deepEqual(prefs['unrelated-table'],[90,100]);assert.deepEqual(prefs['gd-ledger-columns-v1'],old);assert.equal(prefs['gd-ledger-columns-v3'][6],528);
 await root.locator('[data-gd-status=all]').click();await table().locator('.ui-column-handle').first().waitFor();await page.waitForFunction(()=>Math.round(document.querySelector('#ai [data-gd-table] th:nth-child(7)').getBoundingClientRect().width)===528);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await root.locator('[data-gd-part=tasks]').click();await table().locator('.ui-column-handle').first().waitFor();assert.deepEqual(await widths(),[300,340,528],'刷新保留新版调整');
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await root.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'页面不被宽表撑开')}
 console.log('通过：旧360/650px偏好不覆盖新520px列宽、新版拖动微调/筛选重绘/刷新保留、其他表格偏好不变、宽窄屏。');
}
