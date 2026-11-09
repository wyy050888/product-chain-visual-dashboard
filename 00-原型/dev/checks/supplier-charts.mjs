import {verifySupplierJump} from './supplier-navigation.mjs';
import assert from 'node:assert/strict';
export async function verifySupplierCharts(page,root,audit){
 let facts=await audit();
 const coreMaterials=await page.evaluate(()=>[...FilterCatalog.supplierCoreMaterials]);
 const materialHelp=root.locator('[data-scp-material-help]'),materialTip=page.locator('#metric-tooltip');
 assert.equal(await root.locator('.scp-material-title [data-scp-material-help]').count(),0);
 assert.equal(await root.locator('.scp-coverage-chart h4 [data-scp-material-help]').count(),1,'问号移到准入覆盖标题后');
 assert.match(await root.locator('.scp-coverage-legend').innerText(),/达标类目/);
 await materialHelp.scrollIntoViewIfNeeded();await materialHelp.hover();await materialTip.waitFor({state:'visible'});
 assert.match(await materialTip.getAttribute('class'),/metric-tooltip-scp-material/);assert.equal(await materialTip.locator('h4').innerText(),'准入覆盖');
 assert.equal(await materialTip.locator('.scp-material-help-rule strong').innerText(),'达标');
 assert.equal(await materialTip.locator('dl').count(),0,'移除准入覆盖、统计去重等冗余说明，仅保留准入标准');
 assert.equal(await materialHelp.getAttribute('aria-describedby'),'metric-tooltip');await page.keyboard.press('Escape');assert(await materialTip.isHidden());
 await materialHelp.focus();assert(await materialTip.isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Enter');assert(await materialTip.isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Space');assert(await materialTip.isVisible());await page.keyboard.press('Escape');
 await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');await materialHelp.hover();await materialTip.waitFor({state:'visible'});assert.match(await materialTip.locator('.scp-sourcing-note').innerText(),/达标类目数 \/ 5/);await page.keyboard.press('Escape');await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2026');
 for(const width of [1920,390]){await page.setViewportSize({width,height:900});await materialHelp.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.mouse.move(0,0);await materialHelp.click();await materialTip.waitFor({state:'visible'});assert(await materialTip.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'物料口径浮层不越界 '+width);await page.keyboard.press('Escape')}
 await page.setViewportSize({width:1920,height:1080});await page.mouse.move(0,0);

 assert.equal(await root.locator('.scp-quarter-chart').count(),0);
 assert.equal(await root.locator('.scp-resource-table').count(),1,'资源池使用四季度表格，不恢复季度图表');
 const entry=root.locator('[data-scp-annual-metric="cooperated"] .scp-count');assert.equal(await entry.evaluate(e=>e.tagName),'SPAN');
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2025');facts=await audit();assert.equal(+(await entry.innerText()),facts.annual.cooperated);await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2026');facts=await audit();
 assert.equal(await root.locator('.scp-category-chart').count(),0,'移除链群汇总条');
 assert.equal(await root.locator('[data-scp-coverage]').count(),facts.materials.length*coreMaterials.length);
 assert.deepEqual(await root.locator('.scp-coverage-axis').allTextContents(),coreMaterials,'横轴为六类零部件');
 assert.deepEqual(await root.locator('.scp-coverage-brand').allTextContents(),facts.materials.map(row=>row.brand),'纵轴为三个品牌');
 assert.deepEqual(await root.locator('[data-scp-coverage]').evaluateAll(nodes=>nodes.map(n=>JSON.parse(n.dataset.scpCoverage))),facts.materials.flatMap(row=>coreMaterials.map(material=>({brand:row.brand,material}))),'轴向交换保留每格品牌/物料关联');
 const green=await root.locator('.scp-coverage-complete-key').evaluate(e=>getComputedStyle(e).backgroundColor);
 for(const cell of await root.locator('[data-scp-coverage]').all()){
  const scope=JSON.parse(await cell.getAttribute('data-scp-coverage')),brand=facts.materials.find(row=>row.brand===scope.brand),covered=brand.categories.filter(row=>row.stats[scope.material]>=row.stats.admissionTarget).length;assert.equal(+(await cell.getAttribute('data-covered')),covered);
  const complete=covered===brand.categories.length;assert.equal(await cell.evaluate(e=>e.classList.contains('is-complete')),complete);
  assert.equal(await cell.evaluate(e=>getComputedStyle(e).backgroundColor)===green,complete,'全部达标为绿色，未全部达标保留红色');
 }
 const tile=root.locator('[data-scp-coverage]').first(),scope=JSON.parse(await tile.getAttribute('data-scp-coverage'));await tile.click();
 assert.equal(await page.locator('#drawer-tabs button[aria-selected="true"]').innerText(),'类目储备');assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);
 const expected=(await audit()).materials.find(row=>row.brand===scope.brand).categories;assert.deepEqual(await page.locator('.scp-coverage-table tbody td:nth-child(2)').allTextContents(),expected.map(row=>String(row.stats[scope.material])));
 await verifySupplierJump(page,page.locator('.scp-coverage-table [data-scp-jump]').first(),'供应商管理-供应商资源池-全部');assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);await page.locator('#close').click();
 for(const material of ['塑料件','包装']){
  await root.getByRole('button',{name:new RegExp('^'+facts.materials[0].brand+' · '+material+'：')}).click();
  assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);
  const destination=await verifySupplierJump(page,page.locator('.scp-coverage-table [data-scp-jump]').first(),'供应商管理-供应商资源池-全部');
  assert(destination.filters.some(([key,value])=>key==='物料分类'&&value===material),'覆盖明细toast保留新增物料');
  await page.locator('#close').click();
 }
 await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');facts=await audit();const current=facts.materials.find(row=>row.brand===scope.brand).categories.filter(row=>row.stats[scope.material]>=row.stats.admissionTarget).length;assert.equal(+(await root.locator('[data-scp-coverage]').first().getAttribute('data-covered')),current);await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2026');
 for(const width of [1920,1366]){await page.setViewportSize({width,height:1080});assert(await root.locator('.scp-annual-group').evaluateAll(nodes=>nodes.every(e=>e.getBoundingClientRect().height<=100)),'年度卡片保持紧凑高度 '+width);assert(await root.locator('.scp-annual-primary').evaluateAll(nodes=>nodes.every(e=>{const a=e.querySelector('span').getBoundingClientRect(),b=e.querySelector('strong').getBoundingClientRect();return a.bottom<=b.top&&Math.abs(a.left-b.left)<2})),'指标名称和数值上下对齐 '+width);assert(await root.locator('.scp-material-scroll').evaluateAll(nodes=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1||['auto','scroll'].includes(getComputedStyle(e).overflowX))),'物料表列较多时只在表内横向滚动 '+width);assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'宽表不撑宽采购模块 '+width)}
 for(const width of [1024,390]){await page.setViewportSize({width,height:1080});assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await root.locator('[data-scp-coverage]').count(),facts.materials.length*coreMaterials.length)}
 await page.setViewportSize({width:1920,height:1080});console.log('通过：年度资源池同源且数字静态、六物料覆盖热力图、新增物料toast与图表时间联动');
}

export async function verifyCategoryWarning(page,root,audit){
 const a=await audit(),p=a.categoryPeriod,first=p.mode==='year'?1:(p.value-1)*3+1,last=p.mode==='year'?12:p.value*3;
 const start=`${p.year}-${String(first).padStart(2,'0')}-01`,end=new Date(Date.UTC(p.year,last,0)).toISOString().slice(0,10),cutoff=end<'2026-10-10'?end:'2026-10-10';
 const active=new Set(a.companies.filter(s=>s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)).map(s=>s.id));
 const count=rows=>{const dates=new Map();for(const row of rows)if(active.has(row.supplierId)&&row.admitted&&row.admitted<=cutoff){const old=dates.get(row.supplierId);if(!old||row.admitted<old)dates.set(row.supplierId,row.admitted)}return {admitted:dates.size,newAdmitted:[...dates.values()].filter(date=>date>=start).length}};
 const leaves=a.categories.map(category=>({...category,stats:count(a.capabilities.filter(row=>row.kind==='machine'&&row.categoryId===category.id))})).filter(row=>row.stats.admitted<3);
 assert(leaves.length>0&&leaves.length<a.categories.length);
 assert.deepEqual(await root.locator('.scp-category-table [data-scp-leaf]').evaluateAll(rows=>rows.map(row=>row.dataset.scpLeaf)),[...leaves].sort((a,b)=>a.stats.admitted-b.stats.admitted).map(row=>row.id));
 assert.equal(await root.locator('.scp-category-table .scp-tree-toggle').count(),0,'三级类目平铺，无祖先或展开行');
 for(const leaf of leaves){const row=root.locator(`[data-scp-leaf="${leaf.id}"]`);assert.equal(+(await row.locator('td:nth-child(3) .scp-count').innerText()),leaf.stats.admitted);assert.equal(+(await row.locator('td:nth-child(4)').innerText()),leaf.stats.newAdmitted)}
 const help=root.locator('[data-scp-category-help]');await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.mouse.move(0,0);await help.hover();const tip=page.locator('#metric-tooltip');await tip.waitFor({state:'visible'});assert.equal(await tip.locator('h4').innerText(),'类目准入预警');assert.equal(await tip.locator('.scp-sourcing-rule strong').innerText(),'＜3');assert.match(await tip.innerText(),/仅展示准入储备数量＜3的三级类目/);await page.keyboard.press('Escape');await page.mouse.move(0,0);
}
