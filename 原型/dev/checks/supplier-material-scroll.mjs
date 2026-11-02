import assert from 'node:assert/strict';
export async function supplierMaterialScroll(page){
 await page.setViewportSize({width:1920,height:918});
 await page.evaluate(()=>location.hash='#suppliers');
 await page.locator('[data-scp-material-view="个护类"]').first().click();
 const drawer=page.locator('[data-scp-drawer="material-list"]'),body=page.locator('#dialogbody'),results=drawer.locator('.scp-member-results'),nav=drawer.locator('.scp-material-pages .list-pagination');
 await nav.waitFor();
 assert.equal(await results.evaluate(n=>getComputedStyle(n).overflowY),'visible');
 assert.equal(await results.locator('.list-pagination').count(),0,'表格滚动区不包含分页器');
 assert.equal(await drawer.locator('.drawer-table-pagination').count(),0,'没有二次通用分页');
 const total=Number(await nav.getAttribute('data-list-total')),size=Number(await nav.getAttribute('data-list-size'));
 assert(total>size);assert.equal(await drawer.locator('.scp-material-row').count(),size);
 const ids=()=>drawer.locator('.scp-material-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.scpCategoryRow+'|'+n.dataset.scpBrandRow));
 const first=await ids();
 await body.evaluate(n=>{n.scrollTop=300});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 const top=(await body.boundingBox()).y;
 const tabs=await drawer.locator('.scp-material-tabs').boundingBox(),head=await drawer.locator('thead').boundingBox();
 assert(Math.abs(tabs.y-top)<2,'Tab吸附抽屉内容顶部');
 const th=await drawer.locator('thead th').first().boundingBox();assert(Math.abs(th.y-tabs.y-tabs.height)<2,'表头吸附Tab下面');
 await body.evaluate(n=>{n.scrollTop=n.scrollHeight});
 const pager=await nav.boundingBox(),table=await drawer.locator('table').boundingBox();assert(pager.y>=table.y+table.height,'分页器在表格下方');
 await nav.getByRole('button',{name:'第2页',exact:true}).click();assert.equal(await body.evaluate(n=>n.scrollTop),0);
 assert.notDeepEqual(await ids(),first);
 for(const cell of await drawer.locator('.scp-material-category-cell').all()){
  const count=+(await cell.getAttribute('rowspan'));assert(count>=1&&count<=3,'分页后正确合并本页品牌行');
 }
 await drawer.locator('[data-scp-material-search]').fill('不存在的类目');
 assert.equal(await nav.getAttribute('data-list-total'),'0');assert.match(await results.innerText(),/没有符合筛选条件的数据/);
 await drawer.locator('[data-scp-material-search]').fill('');
 await page.locator('#close').click();
 console.log('通过：抽屉单一纵向滚动、Tab及表头吸顶、分页器在表格下方、分页与合并单元格、筛选空态。');
}
