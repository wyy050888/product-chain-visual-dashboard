import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
export async function shopFilters(page){
 await page.locator('#riskrail [data-risk="1"]').click();
 const total=async()=>Number(await page.locator('#rp-list-pagination nav').getAttribute('data-list-total'));
 assert.equal(await page.locator('.pf-multi[data-pf-multi-label="核心主营产品类目"] .unified-field-name').innerText(),'核心主营产品类目');
 const baseline=await total(),menu=page.locator('#dialogbody .pf-attribute');
 const coreRows=await page.locator('#rf-list-table tbody tr').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('.rp-shop-identity b').title,hasCore:Boolean(row.querySelector('.rp-shop-core'))})));
 const coreCount=coreRows.filter(row=>row.hasCore).length;
 const category=page.locator('[data-rp-filter="chain"]'),categories=['个护类','环境类','清洁类','厨电类','健康类'];
 assert.deepEqual(await category.locator('option').allTextContents(),['全部',...categories]);
 const categoryMenu=page.locator('.pf-multi[data-pf-multi-label="核心主营产品类目"]');
 await categoryMenu.locator('summary').click();
 let categoryTotal=0;
 for(const value of categories){const box=categoryMenu.locator('[data-pf-multi-option][value="'+value+'"]');await box.check();categoryTotal+=await total();await box.uncheck()}
 assert(categoryTotal>=coreCount&&categoryTotal<=coreCount*5,'仅达标主营参与类目筛选，跨类目店铺可以重复命中多个单类目');
 assert.equal(await total(),baseline);await categoryMenu.locator('summary').click();
 const search=page.locator('[data-rp-filter="query"]');
 assert.match(await search.getAttribute('placeholder'),/店铺名称.*店铺ID.*产品名称.*SPU码.*型号/);
 const first=page.locator('#rf-list-table tbody tr').first();
 const shopName=await first.locator('.rp-shop-identity b').getAttribute('title');
 const shopId=(await first.locator('.rp-shop-identity small').innerText()).match(/ID：\s*(\d+)/)[1];
 for(const query of [shopName,shopId]){
  await search.fill(query);assert(await total()>0,'搜索应命中：'+query);
  assert((await page.locator('#rf-list-table tbody').innerText()).includes(shopName));
 }
 await search.fill('不应匹配的SPU-000');assert.equal(await total(),0);
 await page.locator('[data-rp-reset]').click();assert.equal(await total(),baseline);
 assert.equal(await page.locator('[data-rp-filter="core"]').count(),0);
 assert.equal(await menu.locator('.unified-field-name').innerText(),'店铺类型');
 const choose=async(key,value)=>{
  if(!(await menu.evaluate(el=>el.open)))await menu.locator('summary').click();
  await menu.locator('[data-pf-attribute-key="'+key+'"][data-pf-attribute-choice="all"]').click();
  if(value!=='all')await menu.locator('[data-pf-attribute-key="'+key+'"][data-pf-attribute-choice="'+value+'"]').click();
 };
 assert.deepEqual(await menu.locator('[data-rp-filter="shopCategory"] option').evaluateAll(ns=>ns.map(n=>n.textContent)),['全部','旗舰店','POP旗舰店','专卖店','POP专卖店','自营','无分类']);
 await choose('assessed','yes');const yes=await total();
 await choose('assessed','no');const no=await total();
 assert(yes>0&&no>0);assert.equal(yes+no,baseline);
 await choose('assessed','all');await choose('shopCategory','自营');
 assert.equal(await total(),1);
 assert.match(await page.locator('#rf-list-table tbody').innerText(),/自营/);
 await choose('assessed','yes');assert.equal(await total(),0);
 await choose('assessed','no');assert.equal(await total(),1);
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 await page.locator('[data-drawer-tab="ranking-1"]').click();
 assert.match(await menu.locator('summary').innerText(),/分类:自营.*是否考核:否/);
 await page.locator('[data-rp-reset]').click();assert.equal(await total(),baseline);
 assert.equal(await menu.locator('.pf-attribute-value').innerText(),'全部');
 // 平台分类收敛，切换时只清理不适用的分类条件，保留查询与考核。
 await choose('shopCategory','自营');await choose('assessed','no');
 await page.locator('.drawer-platform-switch [data-platform-value="抖音"]').click();
 assert.deepEqual(await menu.locator('[data-rp-filter="shopCategory"] option').allTextContents(),['全部','旗舰店','专卖店','无分类']);
 assert.equal(await menu.locator('[data-rp-filter="shopCategory"]').evaluate(el=>[...el.selectedOptions].map(o=>o.value).join(',')),'all');
 assert.match(await menu.locator('summary').innerText(),/是否考核:否/);
 await page.locator('.drawer-platform-switch [data-platform-value="all"]').click();
 assert.deepEqual(await menu.locator('[data-rp-filter="shopCategory"] option').allTextContents(),['全部','旗舰店','POP旗舰店','专卖店','POP专卖店','自营','无分类']);
 await page.locator('[data-rp-reset]').click();assert.equal(await total(),baseline);
 const opened=page.context().waitForEvent('page');await page.locator('#rp-shop-type-config').click();const config=await opened;await config.waitForLoadState();
 assert(config.url().includes('店铺配置.html')||decodeURI(config.url()).includes('店铺配置.html'));await config.close();assert.equal(await total(),baseline);
 await menu.locator('summary').click();
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/shop-type-filter.png',import.meta.url))});
 await page.locator('#close').click();
}
