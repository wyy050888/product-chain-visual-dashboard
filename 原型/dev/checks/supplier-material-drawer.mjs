import assert from 'node:assert/strict';
export async function supplierMaterialDrawer(page){
 await page.evaluate(()=>location.hash='#suppliers');
 const original=await page.evaluate(()=>JSON.stringify(supplierPlanningAudit().materialPeriod));
 assert.equal(await page.locator('.scp-material-card .scp-panel-title').innerText(),'核心物料供应商准入储备');
 await page.getByRole('button',{name:/^美海 · 电池：/}).click();
 const drawer=page.locator('[data-scp-drawer="material-list"]'),table=drawer.locator('.scp-material-detail-table'),search=drawer.locator('[data-scp-material-search]'),brand=drawer.locator('[data-scp-material-brand]'),component=drawer.locator('[data-scp-material-component]'),pager=drawer.locator('.scp-material-pages .list-pagination');
 const selected=field=>field.evaluate(e=>Array.from(e.selectedOptions,o=>o.value)),box=label=>drawer.locator('.pf-multi[data-pf-multi-label="'+label+'"]');
 const choice=async(label,value)=>{const menu=box(label);if(!await menu.evaluate(e=>e.hasAttribute('open')))await menu.locator('[data-pf-multi-trigger]').click();await menu.locator('[data-pf-multi-option][value="'+value+'"]').check()};
 const closeMenus=async()=>{await search.click()};
 const total=async()=>Number(await pager.getAttribute('data-list-total'));
 assert.equal(await page.locator('#dialogtitle').innerText(),'核心物料供应商准入储备');assert.equal(await page.locator('[data-scp-drawer="coverage"]').count(),0);
 assert.deepEqual(await drawer.locator('[role=tab]').allTextContents(),['全部','个护类','环境类','清洁类','厨电类','健康类']);assert.equal(await drawer.locator('[role=tab][aria-selected=true]').innerText(),'全部');
 assert.deepEqual(await selected(brand),['美海']);assert.deepEqual(await selected(component),['电池']);assert.deepEqual(await table.locator('thead th').allTextContents(),['三级类目','品牌','电池']);
 const facts=await page.evaluate(()=>supplierPlanningAudit()),coverage=facts.coverage.find(r=>r.brand==='美海'&&r.material==='电池');assert.equal(await total(),coverage.categories.length);
 for(const row of await table.locator('.scp-material-row').all()){
  const id=await row.getAttribute('data-scp-category-row'),category=coverage.categories.find(c=>c.categoryId===id);
  assert.equal(await row.locator('.scp-material-brand-cell').innerText(),'美海');assert.equal((await row.locator('[data-scp-detail-material="电池"]').innerText()).replace(/\s/g,''),category.count+'/'+category.minimum);
 }
 const jump=JSON.parse(await table.locator('[data-scp-jump]').first().getAttribute('data-scp-jump'));assert(jump.filters.some(([k,v])=>k==='聚量合作品牌'&&v==='美海'));assert(jump.filters.some(([k,v])=>k==='物料分类'&&v==='电池'));assert(jump.filters.some(([k,v])=>k==='准入日期'&&v===coverage.range.start+' — '+coverage.range.cutoff));
 await pager.getByRole('button',{name:'第2页',exact:true}).click();assert.equal(await pager.getAttribute('data-list-current'),'2');
 await choice('品牌','康创');assert.equal(await total(),coverage.categories.length*2);assert.equal(await pager.getAttribute('data-list-current'),'1');
 await choice('核心部件','all');await closeMenus();assert.equal(await table.locator('thead th').count(),8);
 await search.fill(facts.categories[0].name);assert.equal(await total(),2);assert.equal(await table.locator('.scp-material-category-cell').getAttribute('rowspan'),'2');
 await drawer.locator('[data-scp-category-tab="环境类"]').click();assert.equal(await total(),0);assert.match(await table.innerText(),/没有符合筛选条件的数据/);assert.equal(await search.inputValue(),facts.categories[0].name);
 await search.fill('');await choice('核心部件','电机');await closeMenus();assert.deepEqual(await table.locator('thead th').allTextContents(),['三级类目','品牌','电机']);
 await table.locator('[data-rp-sort="电机"]').click();assert.equal(await table.locator('[data-rp-sort="电机"]').getAttribute('data-direction'),'desc');
 await choice('核心部件','电池');await box('核心部件').locator('[data-pf-multi-option][value="电机"]').uncheck();await closeMenus();assert.equal(await table.locator('[data-rp-sort="电池"]').getAttribute('data-direction'),'','隐藏排序列后恢复默认');
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:918});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'筛选后抽屉不横向溢出 '+width)}
 await page.locator('#close').click();await page.setViewportSize({width:1920,height:1080});await page.locator('[data-scp-material-view="清洁类"]').click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'核心物料供应商准入储备');assert.equal(await drawer.locator('[role=tab][aria-selected=true]').innerText(),'清洁类');assert.deepEqual(await selected(brand),['all']);assert.deepEqual(await selected(component),['all']);assert.equal(await table.locator('thead th').count(),8);
 await drawer.locator('[data-scp-category-tab="all"]').click();assert.equal(await total(),facts.categories.length*3);assert.equal(await page.evaluate(()=>JSON.stringify(supplierPlanningAudit().materialPeriod)),original);
 console.log('通过：双入口同抽屉与标题、入口筛选、部件动态列、数量/跳转一致、组合筛选/分页/排序及宽窄屏。');
}
