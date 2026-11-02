import assert from 'node:assert/strict';
export async function multiFilters(page){
 const total=async()=>Number(await page.locator('#rp-list-pagination nav').getAttribute('data-list-total'));
 const values=control=>control.evaluate(e=>[...e.selectedOptions].map(o=>o.value));
 const card=k=>page.locator(`[data-rp-board="${k}"]`);
 const count=async k=>Number((await card(k).locator('[data-risk]').innerText()).match(/\d+/)[0]);
 // 新品类目多选与季品 Tab 取交集，同时刷新横向统计池。
 await page.locator('a[href="#new"]').click();
 const before=await page.evaluate(()=>window.dashboardNewProductsSnapshot());
 await page.locator('[data-nsp-category="清洁类"]').click();await page.locator('[data-nsp-category="环境类"]').click();
 await page.locator('[data-nsp-season="四季品"]').click();
 const selected=await page.evaluate(()=>window.dashboardNewProductsSnapshot());
 const expected=before.rows.filter(p=>['清洁类','环境类'].includes(p.category)&&p.attribute==='四季品');
 assert.deepEqual(selected.rows.map(p=>p.spuId),expected.map(p=>p.spuId));
 assert.equal(await page.locator('#newtop .dp-ring').getAttribute('aria-label'),`共${expected.length}个新品`);
 await page.locator('[data-nsp-category="all"]').click();await page.locator('[data-nsp-season="all"]').click();
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
 // 品质三榜共用单选平台；亏损独立选择且详情继承，公司库存保持不变。
 const stock=await card(3).locator('.rp-entry').allTextContents();
 await card(0).locator('[data-rp-card-platform]').selectOption('抖音',{force:true});
 await card(2).locator('[data-rp-card-platform]').selectOption('快手',{force:true});
 assert.deepEqual(await values(card(2).locator('[data-rp-card-platform]')),['快手']);
 for(const k of [0,1,6])assert.deepEqual(await values(card(k).locator('[data-rp-card-platform]')),['抖音']);
 assert.deepEqual(await card(3).locator('.rp-entry').allTextContents(),stock);
 await card(2).locator('[data-risk]').click();
 const ids=await page.locator('#rf-list-table [data-riskitem]').evaluateAll(es=>es.map(e=>e.dataset.riskitem));
 assert(ids.length>0);assert.equal(new Set(ids).size,ids.length);
 await page.locator('#rf-list-table [data-riskitem]').first().click();
 assert.equal(await page.locator('#up-platform').inputValue(),'快手');
 assert.match(await page.locator('#up-platform option:checked').innerText(),/快手/);
 await page.locator('#close').click();await page.locator('#close').click();
 // 库存榜季品标签沿用多选，取消最后一项恢复全部。
 const season=card(3).locator('.rp-season-menu');
 await season.locator('[data-rp-season-option="夏季品"]').click();await season.locator('[data-rp-season-option="冬季品"]').click();
 assert.deepEqual(await values(card(3).locator('[data-rp-card-season]')),['夏季品','冬季品']);
 await season.locator('[data-rp-season-option="夏季品"]').click();await season.locator('[data-rp-season-option="冬季品"]').click();
 assert.deepEqual(await values(card(3).locator('[data-rp-card-season]')),['all']);
 await card(0).locator('[data-rp-card-platform]').selectOption('抖音',{force:true});await card(2).locator('[data-rp-card-platform]').selectOption('all',{force:true});
}
