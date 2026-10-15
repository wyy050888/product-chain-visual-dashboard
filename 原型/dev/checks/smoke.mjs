import assert from 'node:assert/strict';

export async function smoke(page){
 assert.equal(await page.locator('#riskrail .riskcard').count(),6);
 await page.locator('#riskrail [data-risk="0"]').click();
 const table=page.locator('#dialogbody .rp-list-table');
 assert.ok(await table.locator('tbody tr').count()>0);
 assert.equal(await page.locator('#dialogbody .pf-multi').count(),3);
 const borders=await table.evaluate(e=>[getComputedStyle(e).borderLeftWidth,getComputedStyle(e).borderRightWidth]);
 assert.deepEqual(borders,['0px','0px']);
 await page.locator('#close').click();
 assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);
 const count=await page.locator('#riskrail .rp-detail-link').count();assert.ok(count>0);
}
