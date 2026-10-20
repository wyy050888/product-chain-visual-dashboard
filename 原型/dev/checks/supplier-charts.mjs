import {assertSupplierDateEntry} from './supplier-date-filters.mjs';
import assert from 'node:assert/strict';
export async function verifySupplierCharts(page,root,audit){
 let facts=await audit();
 const materialHelp=root.locator('[data-scp-material-help]'),materialTip=page.locator('#metric-tooltip');
 await materialHelp.scrollIntoViewIfNeeded();await materialHelp.hover();await materialTip.waitFor({state:'visible'});
 assert.match(await materialTip.getAttribute('class'),/metric-tooltip-scp-material/);assert.equal(await materialTip.locator('h4').innerText(),'物料供应商');
 assert.equal(await materialTip.locator('.scp-material-help-rule strong').innerText(),'≥ 5');
 assert.match(await materialTip.innerText(),/达标一级类目数 \/ 5/);assert.match(await materialTip.innerText(),/品牌汇总不累加子类目数量/);assert.match(await materialTip.innerText(),/所选期间新增合作 ÷ 同期目标合作/);
 assert.equal(await materialHelp.getAttribute('aria-describedby'),'metric-tooltip');await page.keyboard.press('Escape');assert(await materialTip.isHidden());
 await materialHelp.focus();assert(await materialTip.isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Enter');assert(await materialTip.isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Space');assert(await materialTip.isVisible());await page.keyboard.press('Escape');
 await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');await materialHelp.hover();await materialTip.waitFor({state:'visible'});assert.equal(await materialTip.locator('.scp-sourcing-note').count(),0);await page.keyboard.press('Escape');await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2026');
 for(const width of [1920,390]){await page.setViewportSize({width,height:900});await materialHelp.scrollIntoViewIfNeeded();await materialHelp.click();await materialTip.waitFor({state:'visible'});assert(await materialTip.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'物料口径浮层不越界 '+width);await page.keyboard.press('Escape')}
 await page.setViewportSize({width:1920,height:1080});await page.mouse.move(0,0);

 assert.equal(await root.locator('.scp-quarter-column').count(),4);
 for(const row of facts.quarters){const column=root.locator(`[data-scp-chart-quarter="${row.quarter}"]`);assert.equal(+(await column.locator('.scp-quarter-actual').getAttribute('data-value')),row.newCooperation);assert.equal(+(await column.locator('.scp-quarter-target').getAttribute('data-value')),row.target)}
 const bar=root.locator('.scp-quarter-chart .scp-quarter-actual').first();const barPayload=JSON.parse(await bar.getAttribute('data-scp-members'));await bar.focus();await page.keyboard.press('Enter');await assertSupplierDateEntry(page,barPayload);assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),facts.quarters[0].newCooperation);await page.locator('#close').click();
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2025');facts=await audit();assert.deepEqual(await root.locator('.scp-quarter-chart .scp-quarter-actual').evaluateAll(es=>es.map(e=>+e.dataset.value)),facts.quarters.map(row=>row.newCooperation));await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2026');
 assert(await root.locator('.scp-category-chart').evaluate(e=>e.getBoundingClientRect().height<180),'类目柱图不受级联菜单固定列高影响');
 assert.equal(await root.locator('[data-scp-coverage]').count(),20);
 for(const cell of await root.locator('[data-scp-coverage]').all()){
  const scope=JSON.parse(await cell.getAttribute('data-scp-coverage')),brand=facts.materials.find(row=>row.brand===scope.brand),covered=brand.categories.filter(row=>row.stats[scope.material]>=5).length;assert.equal(+(await cell.getAttribute('data-covered')),covered);
 }
 const tile=root.locator('[data-scp-coverage]').first(),scope=JSON.parse(await tile.getAttribute('data-scp-coverage'));await tile.click();
 assert.equal(await page.locator('#drawer-tabs button[aria-selected="true"]').innerText(),'类目储备');assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);
 const expected=(await audit()).materials.find(row=>row.brand===scope.brand).categories;assert.deepEqual(await page.locator('.scp-coverage-table tbody td:nth-child(2)').allTextContents(),expected.map(row=>String(row.stats[scope.material])));
 const firstCount=+(await page.locator('.scp-coverage-table [data-scp-members]').first().innerText());await page.locator('.scp-coverage-table [data-scp-members]').first().click();assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),Math.min(20,firstCount));assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'1');await page.locator('.drawer-back').click();assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);await page.locator('#close').click();
 await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');facts=await audit();const current=facts.materials.find(row=>row.brand===scope.brand).categories.filter(row=>row.stats[scope.material]>=5).length;assert.equal(+(await root.locator('[data-scp-coverage]').first().getAttribute('data-covered')),current);await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2026');
 for(const width of [1920,1366]){await page.setViewportSize({width,height:1080});assert(await root.locator('.scp-annual').evaluate(e=>e.getBoundingClientRect().height<=100),'年度指标压缩高度 '+width);assert(await root.locator('.scp-quarter-chart .scp-quarter-bars').first().evaluate(e=>e.getBoundingClientRect().height>=90),'季度柱形图获得足够高度 '+width);assert(await root.locator('.scp-annual-primary').evaluateAll(nodes=>nodes.every(e=>{const a=e.querySelector('span').getBoundingClientRect(),b=e.querySelector('strong').getBoundingClientRect();return a.right<=b.left&&Math.abs(a.top+a.height/2-b.top-b.height/2)<2})),'指标名称和数值左右对齐 '+width);assert(await root.locator('.scp-resource-card .scp-card-scroll').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'四个季度完整展示 '+width);assert(await root.locator('.scp-material-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'物料表无需左右翻页 '+width)}
 for(const width of [1024,390]){await page.setViewportSize({width,height:1080});assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await root.locator('[data-scp-coverage]').count(),20)}
 await page.setViewportSize({width:1920,height:1080});console.log('通过：季度对比图同源、键盘下钻、20格覆盖热力图、类目/供应商逐层返回与图表时间联动');
}

export async function verifyCategoryWarning(page,root,audit){
 const a=await audit(),p=a.categoryPeriod,first=p.mode==='year'?1:(p.value-1)*3+1,last=p.mode==='year'?12:p.value*3;
 const start=`${p.year}-${String(first).padStart(2,'0')}-01`,end=new Date(Date.UTC(p.year,last,0)).toISOString().slice(0,10),cutoff=end<'2026-10-10'?end:'2026-10-10';
 const active=new Set(a.companies.filter(s=>s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)).map(s=>s.id));
 const count=rows=>{const dates=new Map();for(const row of rows)if(active.has(row.supplierId)&&row.admitted&&row.admitted<=cutoff){const old=dates.get(row.supplierId);if(!old||row.admitted<old)dates.set(row.supplierId,row.admitted)}return {admitted:dates.size,newAdmitted:[...dates.values()].filter(date=>date>=start).length}};
 const leaves=a.categories.map(category=>({...category,stats:count(a.capabilities.filter(row=>row.kind==='machine'&&row.categoryId===category.id))})).filter(row=>row.stats.admitted<3);
 assert(leaves.length>0&&leaves.length<a.categories.length);
 assert.deepEqual(await root.locator('.scp-category-table [data-scp-leaf]').evaluateAll(rows=>rows.map(row=>row.dataset.scpLeaf)),leaves.map(row=>row.id));
 assert.equal(await root.locator('.scp-category-table .scp-tree-toggle').count(),0,'三级类目平铺，无祖先或展开行');
 for(const leaf of leaves){const row=root.locator(`[data-scp-leaf="${leaf.id}"]`);assert.equal(+(await row.locator('td:nth-child(2)').innerText()),leaf.stats.admitted);assert.equal(+(await row.locator('td:nth-child(3)').innerText()),leaf.stats.newAdmitted)}
 for(const category of [...new Set(a.categories.map(row=>row.category))]){
  const expected=count(a.capabilities.filter(row=>row.kind==='machine'&&row.category===category)),bars=root.locator(`[data-scp-category-chart="${category}"] [data-value]`);
  assert.deepEqual(await bars.evaluateAll(nodes=>nodes.map(node=>+node.dataset.value)),[expected.admitted,expected.newAdmitted]);
 }
 const help=root.locator('[data-scp-category-help]');await help.hover();const tip=page.locator('#metric-tooltip');await tip.waitFor({state:'visible'});assert.equal(await tip.locator('h4').innerText(),'类目准入预警');assert.equal(await tip.locator('.scp-sourcing-rule strong').innerText(),'＜3');assert.match(await tip.innerText(),/仅展示已准入数量＜3的三级类目/);await page.keyboard.press('Escape');await page.mouse.move(0,0);
}
