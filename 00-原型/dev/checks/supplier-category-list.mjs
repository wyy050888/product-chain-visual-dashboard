import assert from 'node:assert/strict';
export async function verifySupplierCategoryList(page,root,audit){
 const facts=await audit(),names=['个护类','环境类','清洁类','厨电类','健康类'];
 await root.locator('[data-scp-all-categories]').click();
 const drawer=page.locator('[data-scp-drawer="categories"]'),rows=drawer.locator('[data-scp-category-list-row]'),search=drawer.locator('[data-scp-category-search]'),status=drawer.locator('[data-scp-category-filter="status"]'),year=page.locator('#dialogsub [data-scp-year]');
 assert.deepEqual(await drawer.locator('[role=tab]').allTextContents(),names);assert.equal(await drawer.locator('[data-scp-category-filter="category"]').count(),0);
 assert.equal(await drawer.locator('[role=tab][aria-selected=true]').innerText(),names[0]);
 assert.deepEqual(await drawer.locator('thead th').allTextContents(),['三级类目','一级类目','二级类目','意向储备（总）','准入储备（总）','已合作（总）','26年新增准入','26年新增合作']);
 assert(await drawer.locator('.scp-member-pages').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'新增Tab后分页仍在视口内');
 await page.screenshot({path:'outputs/supplier-revision-20261030/category-tabs.png'});
 const seen=[];
 for(const name of names){
  await drawer.locator('[data-scp-category-tab='+JSON.stringify(name)+']').click();
  assert.equal(await drawer.locator('.list-pagination').getAttribute('data-list-current'),'1');
  for(let i=0;i<10;i++){
   const ids=await rows.evaluateAll(nodes=>nodes.map(n=>n.dataset.scpCategoryListRow));seen.push(...ids);
   assert(ids.every(id=>facts.categories.some(c=>c.id===id&&c.category===name)));
   const next=drawer.locator('[aria-label="下一页"]');if(await next.isDisabled())break;await next.click();
  }
 }
 assert.deepEqual([...seen].sort(),facts.categories.map(c=>c.id).sort());assert.equal(new Set(seen).size,seen.length);
 await search.fill('不存在的类目');await status.selectOption('warning');await drawer.locator('[data-scp-category-tab="清洁类"]').click();
 assert.equal(await search.inputValue(),'不存在的类目');assert.equal(await status.inputValue(),'warning');assert.equal(await rows.count(),0);
 await drawer.locator('[data-scp-category-reset]').click();assert.equal(await drawer.locator('[role=tab][aria-selected=true]').innerText(),'清洁类');assert.equal(await search.inputValue(),'');assert.equal(await status.inputValue(),'all');assert(await rows.count()>0);
 const before=(await audit()).categoryPeriod;await year.selectOption('2025');assert.equal((await audit()).categoryPeriod.year,before.year,'本层年份不回写首页');
 for(const width of [1920,1366,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1))}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 console.log('通过：类目清单五Tab替代下拉、完整字典分页无遗漏、筛选保留/重置、独立年份及宽窄屏。');
}
export async function supplierCategoryTabs(page){await page.evaluate(()=>location.hash='#suppliers');await verifySupplierCategoryList(page,page.locator('#suppliers'),()=>page.evaluate(()=>supplierPlanningAudit()))}
