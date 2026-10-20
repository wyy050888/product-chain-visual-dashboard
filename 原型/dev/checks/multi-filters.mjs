import assert from 'node:assert/strict';
export async function multiFilters(page){
 const total=async()=>Number(await page.locator('#rp-list-pagination nav').getAttribute('data-list-total'));
 const values=control=>control.evaluate(e=>[...e.selectedOptions].map(o=>o.value));
 const card=k=>page.locator(`[data-rp-board="${k}"]`);
 const count=async k=>Number((await card(k).locator('[data-risk]').innerText()).match(/\d+/)[0]);
 // 新品两项取交集，单项内取并集，同时刷新左侧统计池。
 await page.locator('a[href="#new"]').click();
 const before=await page.evaluate(()=>window.dashboardNewProductsSnapshot());
 await page.locator('#newchain').selectOption(['清洁类','环境类'],{force:true});
 await page.locator('#newseason').selectOption(['夏季品','四季品'],{force:true});
 const selected=await page.evaluate(()=>window.dashboardNewProductsSnapshot());
 const expected=before.rows.filter(p=>['清洁类','环境类'].includes(p.category)&&['夏季品','四季品'].includes(p.attribute));
 assert.deepEqual(selected.rows.map(p=>p.spuId),expected.map(p=>p.spuId));
 assert.equal(await page.locator('#newtop .dp-ring').getAttribute('aria-label'),`共${expected.length}个新品`);
 await page.locator('#newchain').selectOption('全部',{force:true});await page.locator('#newseason').selectOption('all',{force:true});
 // 五个产品榜季品多选，并继承到各自完整榜单。
 await page.locator('a[href="#risk"]').click();
 for(const k of [0,2,3,4,6]){
  const control=card(k).locator('[data-rp-card-season]');
  await control.selectOption('夏季品',{force:true});const a=await count(k);
  await control.selectOption('冬季品',{force:true});const b=await count(k);
  await control.selectOption(['夏季品','冬季品'],{force:true});assert.equal(await count(k),a+b);
  await card(k).locator('[data-risk]').click();
  assert.deepEqual(await values(page.locator('[data-rp-filter="attribute"]')),['夏季品','冬季品']);
  assert.equal(await total(),a+b);
  await page.locator('[data-rp-filter="productType"]').selectOption(['new','old','clearance'],{force:true});
  await page.locator('[data-rp-reset]').click();
  assert.equal(await page.locator('.pf-attribute [aria-checked=true]').count(),2);
  await page.locator('#close').click();await control.selectOption('all',{force:true});
 }
 // 平台保持单选，首页和抽屉一致；其他字段继续多选。
 const platform=card(0).locator('[data-rp-card-platform]');
 await platform.selectOption('抖音',{force:true});const a=await count(0);
 await platform.selectOption('快手',{force:true});const b=await count(0);
 assert.equal(await platform.evaluate(e=>e.multiple),false);
 await card(0).locator('[data-risk]').click();assert.equal(await total(),b);
 assert.deepEqual(await values(page.locator('#qr-list-platform')),['快手']);
 assert.equal(await page.locator('#qr-list-platform').evaluate(e=>e.multiple),false);
 await page.locator('[data-rp-filter="qualityRisk"]').selectOption(['fine','frozen'],{force:true});
 assert(await total()<=a+b);
 await page.locator('[data-drawer-tab="ranking-1"]').click();
 await page.locator('[data-rp-filter="shopCategory"]').selectOption(['旗舰店','专卖店'],{force:true});
 await page.locator('[data-rp-filter="assessed"]').selectOption(['yes','no'],{force:true});
 const shops=await total();
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.deepEqual(await values(page.locator('[data-rp-filter="qualityRisk"]')),['fine','frozen']);
 await page.locator('[data-drawer-tab="ranking-1"]').click();assert.equal(await total(),shops);
 await page.locator('#close').click();
 // 共用单选平台不改变公司库存；亏损详情继承平台。
 const stock=await card(3).locator('.rp-entry').allTextContents();
 await card(2).locator('[data-rp-card-platform]').selectOption('快手',{force:true});
 for(const k of [1,2,6])assert.deepEqual(await values(card(k).locator('[data-rp-card-platform]')),['快手']);
 assert.deepEqual(await card(3).locator('.rp-entry').allTextContents(),stock);
 await card(2).locator('[data-risk]').click();
 const ids=await page.locator('#rf-list-table [data-riskitem]').evaluateAll(es=>es.map(e=>e.dataset.riskitem));
 assert(ids.length>0);assert.equal(new Set(ids).size,ids.length);
 await page.locator('#rf-list-table [data-riskitem]').first().click();
 assert.equal(await page.locator('#up-platform').inputValue(),'快手');
 assert.match(await page.locator('#up-platform option:checked').innerText(),/快手/);
 await page.locator('#close').click();await page.locator('#close').click();
 // 真正勾选交互应保持菜单打开，取消最后一项恢复全部。
 const season=card(3).locator('.pf-multi');await season.locator('summary').click();
 await season.locator('input[value="夏季品"]').check();await season.locator('input[value="冬季品"]').check();
 assert.deepEqual(await values(card(3).locator('[data-rp-card-season]')),['夏季品','冬季品']);
 await season.locator('input[value="夏季品"]').uncheck();await season.locator('input[value="冬季品"]').uncheck();
 assert.deepEqual(await values(card(3).locator('[data-rp-card-season]')),['all']);await page.keyboard.press('Escape');
 await card(0).locator('[data-rp-card-platform]').selectOption('抖音',{force:true});await card(2).locator('[data-rp-card-platform]').selectOption('all',{force:true});
}
