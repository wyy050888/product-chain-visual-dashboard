import assert from 'node:assert/strict';
export async function verifyProductTabs(page,detailRef){
 const root=page.locator('.up-detail:not(.sd-detail)');
 const keys=()=>root.locator('.drawer-tabs [data-drawer-tab]').evaluateAll(es=>es.map(e=>e.dataset.drawerTab));
 assert.deepEqual(await keys(),['operating','quality','stock']);
 assert.equal(await root.locator('[data-up-panel="handling"],#up-todo-table,[data-todo-create],[data-todo-tab]').count(),0,'移除风险待办内容与操作');
 for(const key of ['operating','quality','stock']){
  await root.locator('[data-drawer-tab="'+key+'"]').click();assert.equal(await root.getAttribute('data-up-tab'),key);
  assert(await root.locator('[data-up-panel="'+key+'"]').isVisible());
  await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  await page.setViewportSize({width:1920,height:1080});
 }
 // 旧页签事件不能激活已经移除的面板。
 await root.locator('.drawer-tabs').evaluate(e=>{const b=document.createElement('button');b.dataset.drawerTab='handling';e.append(b);b.click();b.remove()});
 assert.equal(await root.getAttribute('data-up-tab'),'stock');assert(await root.locator('[data-up-panel="stock"]').isVisible());
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')||'{}'));
 const before=await records();await page.locator('.drawer-back').click();
 await page.locator('button[data-qr-detail="'+detailRef+'"]').last().click();
 assert.deepEqual(await keys(),['operating','quality','stock']);assert.deepEqual(await records(),before,'重新打开详情不创建或修改待办');
 await page.locator('.drawer-back').click();await page.locator('#close').click();
}
