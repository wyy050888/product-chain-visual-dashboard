import assert from 'node:assert/strict';

export async function columnResize(page){
 const width=cell=>cell.evaluate(e=>e.getBoundingClientRect().width);
 const drag=async(cell,delta)=>{
  const handle=cell.locator(':scope > [data-ui-column-handle]');await handle.scrollIntoViewIfNeeded();
  const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta,y,{steps:8});await page.mouse.up();
 };
 const near=(actual,expected)=>assert(Math.abs(actual-expected)<2,actual+' ≠ '+expected);
 await page.locator('a[href="#new"]').click();
 const newTable=page.locator('#newtable table'),gsv=newTable.locator('thead th').nth(2);
 await gsv.locator('[data-ui-column-handle]').waitFor();
 assert(await page.locator('table').evaluateAll(es=>es.filter(e=>e.tHead).every(e=>e.querySelectorAll('thead [data-ui-column-handle]').length===e.querySelectorAll('thead th').length)),'动态表格统一挂载列宽控件');
 const label=await gsv.textContent(),before=await width(gsv),other=await width(newTable.locator('thead th').nth(3));
 const sorted=await gsv.getAttribute('aria-sort');await drag(gsv,96);
 near(await width(gsv),before+96);near(await width(newTable.locator('thead th').nth(3)),other);
 assert.equal(await gsv.getAttribute('aria-sort'),sorted,'拖拽不触发排序');assert.equal(await gsv.textContent(),label);
 await gsv.locator('[data-ui-column-handle]').focus();await page.keyboard.press('ArrowLeft');
 const expected=await width(gsv);near(expected,before+88);
 await gsv.locator('[data-nsp-sort]').click();
 await page.waitForFunction(w=>Math.abs(document.querySelector('#newtable th:nth-child(3)').getBoundingClientRect().width-w)<2,expected);
 await page.reload();await page.locator('a[href="#new"]').click();
 await page.waitForFunction(w=>Math.abs(document.querySelector('#newtable th:nth-child(3)').getBoundingClientRect().width-w)<2,expected);
 // 六榜固定左右列：改变序号/操作列宽后，相邻固定列同步更新偏移。
 await page.locator('#riskrail [data-risk="0"]').click();
 const ranking=page.locator('#qr-list-table table'),first=ranking.locator('thead th').first();
 await first.locator('[data-ui-column-handle]').waitFor();const oldFirst=await width(first);await drag(first,40);
 const firstWidth=await width(first);near(firstWidth,oldFirst+40);
 near(await ranking.locator('thead th').nth(1).evaluate(e=>parseFloat(getComputedStyle(e).left)),firstWidth);
 near(await ranking.locator('tbody tr').first().locator('td').nth(1).evaluate(e=>parseFloat(getComputedStyle(e).left)),firstWidth);
 const last=ranking.locator('thead th').last(),oldLast=await width(last);await drag(last,-16);near(await width(last),oldLast-16);
 const trend=ranking.locator('thead th').filter({has:page.locator('.rp-trend-heading')});
 near(await trend.evaluate(e=>parseFloat(getComputedStyle(e).right)),await width(last));
 const rankingWidth=await width(first);await ranking.locator('[data-rp-sort="gsv"]').click();
 await page.waitForFunction(w=>Math.abs(document.querySelector('#qr-list-table th').getBoundingClientRect().width-w)<2,rankingWidth);
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 await page.locator('[data-drawer-tab="handling"]').click();
 const todo=page.locator('#up-todo-table table'),description=todo.locator('thead th').nth(1);
 await description.locator('[data-ui-column-handle]').waitFor();const oldDescription=await width(description);await drag(description,70);near(await width(description),oldDescription+70);
 await page.locator('[data-todo-create]').click();assert(await page.locator('.up-todo-dialog').isVisible());await page.keyboard.press('Escape');
 await page.locator('.drawer-back').click();await page.locator('#close').click();
 // 合并表头、已有colgroup及后插入表格，使用同一组件。
 await page.evaluate(()=>{
  const host=document.createElement('div');host.id='column-resize-fixture';host.style='position:fixed;left:30px;top:100px;width:700px;z-index:99999;background:white';
  host.innerHTML='<table style="width:700px"><colgroup><col><col><col></colgroup><thead><tr><th rowspan="2">对象</th><th colspan="2">经营指标</th></tr><tr><th>数量</th><th>金额</th></tr></thead><tbody><tr><td>测试</td><td>20</td><td>100</td></tr></tbody></table>';document.body.append(host);
 });
 const fixture=page.locator('#column-resize-fixture table'),amount=fixture.locator('thead tr').nth(1).locator('th').nth(1);
 await amount.locator('[data-ui-column-handle]').waitFor();const oldAmount=await width(amount);await drag(amount,64);near(await width(amount),oldAmount+64);
 const group=fixture.locator('thead tr').first().locator('th').nth(1),oldGroup=await width(group);await drag(group,32);near(await width(group),oldGroup+32);
 await amount.locator('[data-ui-column-handle]').focus();await page.keyboard.press('ArrowRight');near(await width(amount),oldAmount+104);
 const handleBox=await amount.locator('[data-ui-column-handle]').boundingBox();
 await page.mouse.move(handleBox.x+4,handleBox.y+10);await page.mouse.down();
 await page.locator('#column-resize-fixture').evaluate(e=>e.remove());
 await page.waitForFunction(()=>!document.body.classList.contains('ui-column-resizing'));
 await page.mouse.up();
 await page.setViewportSize({width:390,height:844});await page.locator('a[href="#new"]').click();
 assert.equal(await page.locator('.page').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'调整后的表格在自身容器横向滚动');
 await page.setViewportSize({width:1920,height:1080});
}
