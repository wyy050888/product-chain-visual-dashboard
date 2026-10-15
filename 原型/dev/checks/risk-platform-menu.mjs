import assert from 'node:assert/strict';
export async function riskPlatformMenu(page){
 const menu=kind=>page.locator('#riskrail [data-rp-platform-menu="'+kind+'"]');
 const choose=async(kind,value)=>{if(!await menu(kind).evaluate(n=>n.open))await menu(kind).locator('summary').click();await menu(kind).locator('[data-rp-platform-option="'+value+'"]').click();await page.keyboard.press('Escape')};
 const values=()=>page.locator('#riskrail [data-rp-card-platform]').evaluateAll(ns=>ns.map(n=>n.value));
 assert.equal(await page.locator('#riskrail .rp-platform-menu').count(),4);
 assert.equal(await page.locator('.qr-card .rp-quality-entry .rp-identity .rp-platform-mark').count(),0);
 assert.ok(await page.locator('#riskrail .riskcard').nth(1).locator('.rp-identity .rp-platform-mark').count()>0);
 assert.equal(await menu(0).locator('summary img').getAttribute('alt'),'抖音');
 await menu(0).locator('summary').click();
 assert.equal(await menu(0).locator('[role="menuitemradio"] img').count(),6);
 assert.equal(await menu(0).locator('[data-rp-platform-option="all"]').count(),1);
 assert.ok(await menu(0).locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)));
 await menu(0).locator('[data-rp-platform-option="快手"]').click();
 assert.equal(await menu(0).locator('summary img').getAttribute('alt'),'快手');
 assert.deepEqual(await values(),['快手','all','all','all']);
 assert.equal(await menu(0).evaluate(n=>n.open),false);await page.keyboard.press('Escape');
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.equal(await page.locator('#qr-list-platform').inputValue(),'快手');
 assert.equal(await page.locator('#qr-list-table tbody .rp-platform-mark').count(),0);
 assert.equal(await page.locator('#qr-list-table th').filter({hasText:/^平台$/}).count(),0);
 await page.locator('#close').click();
 const stagnant=page.locator('#riskrail [data-rp-board="4"]');
 const staleBefore=await stagnant.locator('.rp-stock-entry').allTextContents();
 assert.equal(await menu(4).count(),0);
 await choose(1,'京东');assert.deepEqual(await values(),['快手','京东','京东','京东']);
 assert.deepEqual(await stagnant.locator('.rp-stock-entry').allTextContents(),staleBefore,'其他榜平台切换不影响呆滞榜');
 await stagnant.locator('[data-risk="4"]').click();
 assert.equal(await page.locator('#dialogbody .rp-platform-tools').count(),0);
 assert.equal(await page.locator('#rf-return-platform').count(),0);
 await page.locator('#close').click();
 for(const k of [1,2,6])assert.equal(await menu(k).locator('summary img').getAttribute('alt'),'京东');
 await menu(0).locator('summary').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
 assert.equal(await menu(0).locator('summary img').getAttribute('alt'),'抖音');
 await menu(0).locator('summary').click();await page.keyboard.press('Escape');assert.equal(await menu(0).evaluate(n=>n.open),false);
 await menu(0).locator('summary').click();await menu(1).locator('summary').click();assert.equal(await menu(0).evaluate(n=>n.open),false);
 await page.locator('#risk>.sectionhead h2').click();assert.equal(await menu(1).evaluate(n=>n.open),false);
 await choose(1,'all');
 for(const width of [1920,1440,390]){
  await page.setViewportSize({width,height:1080});await menu(0).locator('summary').click();
  const bounds=await menu(0).locator('.rp-platform-options').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
}
