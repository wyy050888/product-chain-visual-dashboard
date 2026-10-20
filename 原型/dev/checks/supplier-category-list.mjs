import assert from 'node:assert/strict';
export async function verifySupplierCategoryList(page,root,audit){
 const facts=await audit(),entry=root.locator('[data-scp-all-categories]');
 assert.equal(await entry.innerText(),'查看全部 '+facts.categories.length);
 // 入口不继承预警限定或外侧搜索；完整字典跨页无遗漏、无重复。
 await root.locator('[data-scp-query="category"]').fill('可视挖耳勺');await entry.click();
 const list=page.locator('[data-scp-drawer="categories"]'),rows=list.locator('[data-scp-category-list-row]'),field=key=>list.locator(`[data-scp-category-filter="${key}"]`),search=list.locator('[data-scp-category-search]'),year=page.locator('#dialogsub [data-scp-year]');
 assert.equal(await page.locator('#dialogtitle').innerText(),'三级类目列表');assert.equal(await page.locator('#drawer-tabs button').count(),0);assert(await page.locator('#drawer-tabs').isHidden());assert.equal(await page.locator('#dialogbody').getAttribute('role'),'region');
 assert.deepEqual(await list.locator('thead th').allTextContents(),['三级类目','一级类目','二级类目','已储备','已准入','新增准入']);
 assert.equal(await field('status').inputValue(),'all');assert.equal(await list.locator('.unified-input-group').count(),3);
 assert.equal(await list.locator('[data-scp-quarter],[data-scp-mode]').count(),0);assert.equal(await year.inputValue(),String(facts.categoryPeriod.year));
 const ids=[];
 for(let i=0;i<10;i++){
  ids.push(...await rows.evaluateAll(es=>es.map(e=>e.dataset.scpCategoryListRow)));
  const next=list.locator('[aria-label="下一页"]');if(await next.isDisabled())break;await next.click();
 }
 assert.deepEqual(ids,facts.categories.map(c=>c.id));assert.equal(new Set(ids).size,ids.length);
 await search.fill('可视挖耳勺');assert.equal(await rows.count(),1);assert.equal(await list.locator('.list-pagination').getAttribute('data-list-current'),'1');
 const name=await rows.locator('td').first().innerText(),count=+(await rows.locator('td:nth-child(5)').innerText()),categoryWidth=await page.locator('#dialog').evaluate(e=>parseFloat(getComputedStyle(e).width));
 await rows.locator('td:nth-child(5) button').click();assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'1');
 assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),count);assert(categoryWidth>await page.locator('#dialog').evaluate(e=>parseFloat(getComputedStyle(e).width)),'三级类目列表比下钻的供应商抽屉宽');await page.locator('.drawer-back').click();assert(Math.abs(categoryWidth-await page.locator('#dialog').evaluate(e=>parseFloat(getComputedStyle(e).width)))<1,'返回恢复三级类目宽度');
 assert(await page.locator('#drawer-tabs').isHidden());assert.equal(await year.inputValue(),String(facts.categoryPeriod.year));
 assert.equal(await search.inputValue(),'可视挖耳勺');assert.equal(await rows.locator('td').first().innerText(),name);
 await list.locator('[data-scp-category-reset]').click();await field('category').selectOption('个护类');
 assert((await rows.locator('td:nth-child(2)').allTextContents()).every(s=>s==='个护类'));
 await field('status').selectOption('met');assert(await rows.count()>0);assert((await rows.locator('td:nth-child(5)').allTextContents()).every(s=>+s>=3));
 await field('status').selectOption('warning');assert((await rows.locator('td:nth-child(5)').allTextContents()).every(s=>+s<3));
 await list.locator('[data-scp-category-reset]').click();await list.locator('[data-rp-sort="admitted"]').click();
 let values=await rows.locator('td:nth-child(5)').allTextContents();assert(values.every((s,i)=>!i||+values[i-1]>=+s));
 // 同期数字与能力台账按供应商身份去重一致。
 const period=facts.categoryPeriod,start=`${period.year}-${String(period.mode==='year'?1:(period.value-1)*3+1).padStart(2,'0')}-01`,cutoff='2026-10-10';
 const active=new Set(facts.companies.filter(s=>s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)).map(s=>s.id));
 for(const row of await rows.all()){
  const id=await row.getAttribute('data-scp-category-list-row'),dates=new Map();
  for(const c of facts.capabilities)if(c.kind==='machine'&&c.categoryId===id&&active.has(c.supplierId)&&c.admitted&&c.admitted<=cutoff&&(!dates.has(c.supplierId)||c.admitted<dates.get(c.supplierId)))dates.set(c.supplierId,c.admitted);
  assert.equal(+(await row.locator('td:nth-child(5)').innerText()),dates.size);
  assert.equal(+(await row.locator('td:nth-child(6)').innerText()),[...dates.values()].filter(date=>date>=start).length);
 }
 assert.equal(await list.locator('[data-scp-quarter],[data-scp-mode]').count(),0);
 await year.selectOption('2027');assert((await rows.locator('td:nth-child(5)').allTextContents()).every(s=>s==='—'));
 await year.selectOption('2025');assert((await rows.locator('td:nth-child(5)').allTextContents()).some(s=>+s>0));
 assert.deepEqual((await audit()).categoryPeriod,facts.categoryPeriod,'抽屉时间不回写外侧');
 for(const width of [1920,1366,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'类目抽屉不撑宽 '+width);const a=await year.boundingBox(),b=await page.locator('#close').boundingBox();assert(width>520?a.x+a.width<=b.x&&Math.abs(a.y+a.height/2-b.y-b.height/2)<4:a.x+a.width<=b.x+b.width&&a.y+a.height<=(await page.locator('#dialogbody').boundingBox()).y,'期间位于抽屉标题右侧且不遮挡内容 '+width)}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 assert.equal(await root.locator('[data-scp-query="category"]').inputValue(),'可视挖耳勺');await root.locator('[data-scp-query="category"]').fill('');
 await entry.click();assert.equal(await field('category').inputValue(),'all');assert.equal(await field('status').inputValue(),'all');await page.keyboard.press('Escape');assert(await list.isHidden());
 console.log('通过：完整三级类目67项、筛选排序分页、统计同源、数量下钻返回、独立期间及窄屏布局');
}
