import {navigationPerformance} from './navigation-performance.mjs';
import assert from 'node:assert/strict';

export async function smoke(page){
 await navigationPerformance(page);
 assert.equal(await page.locator('#riskrail .riskcard').count(),6);
 await page.locator('#riskrail [data-risk="0"]').click();
 const table=page.locator('#dialogbody .rp-list-table');
 assert.ok(await table.locator('tbody tr').count()>0);
 assert.equal(await page.locator('#dialogbody .rp-list-tools .pf-multi').count(),4,'原有四项筛选保留');
 assert.equal(await page.locator('#dialogbody .rp-platform-tools .drawer-platform-switch').count(),1,'平台多选以独立按钮组展示');
 assert.equal(await page.locator('#dialogbody .rp-platform-tools .platform-button .platform-mark').count(),6,'六平台图标齐全');
 assert(await page.locator('#qr-list-platform').evaluate(select=>select.multiple),'榜单平台使用多选');
 const borders=await table.evaluate(e=>[getComputedStyle(e).borderLeftWidth,getComputedStyle(e).borderRightWidth]);
 assert.deepEqual(borders,['0px','0px']);
 await page.locator('#close').click();
 assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);
 const count=await page.locator('#riskrail .rp-detail-link').count();assert.ok(count>0);
}
