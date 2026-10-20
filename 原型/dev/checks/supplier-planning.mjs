import {verifySupplierResourceHelp} from './supplier-resource-help.mjs';
import {verifySupplierPeriods} from './supplier-periods.mjs';
import {captureSupplierDayCalendar,assertSupplierDateEntry} from './supplier-date-filters.mjs';
import {verifySupplierCategoryList} from './supplier-category-list.mjs';
import {verifySupplierLists} from './supplier-lists.mjs';
import {verifySupplierCharts,verifyCategoryWarning} from './supplier-charts.mjs';
import assert from 'node:assert/strict';
import {verifySupplierPlanningModel} from './supplier-planning-model.mjs';
export async function supplierPlanning(page){
 await captureSupplierDayCalendar(page);
 await page.locator('a[href="#suppliers"]').click();const root=page.locator('#suppliers'),audit=()=>page.evaluate(()=>window.supplierPlanningAudit());
 assert.equal(await root.locator('[data-scp-period="material"] select').count(),1);assert.equal(await root.locator('[data-scp-period="material"] [data-scp-quarter]').count(),0);
 const initial=await audit();verifySupplierPlanningModel(initial);await verifySupplierResourceHelp(page,root);await verifySupplierPeriods(page,root,audit);await verifySupplierCategoryList(page,root,audit);await verifySupplierCharts(page,root,audit);await verifySupplierLists(page,root,audit);
 assert.deepEqual(await root.locator('.scp-machine-grid h4').allTextContents(),['产品寻源预警','类目准入预警','整机资源池']);
 assert.equal(await root.locator('.metric-help').count(),4);assert(!/\d+[ \t]*家/.test(await root.innerText()));
 assert.equal(await root.locator('[data-scp-mode]').count(),4);assert.equal(await root.locator('[data-scp-quarter]').count(),0);assert.deepEqual(initial.categoryPeriod,{year:2026,mode:'year',value:1});assert.equal(await root.locator('.scp-resource-table th').first().innerText(),'季度');
 const boxes=await root.locator('.scp-machine-grid>.scp-card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
 assert(Math.abs(boxes[1].width/boxes[0].width-2)<.02&&Math.abs(boxes[2].width/boxes[0].width-2)<.02&&boxes.every(b=>b.top===boxes[0].top),'桌面1:2:2');
 const cutoff='2026-10-10',active=new Set(initial.companies.filter(company=>company.reserved<=cutoff&&(!company.disabled||company.disabled>cutoff)).map(company=>company.id));
 const projectCounts=project=>Object.fromEntries(['reserved','admitted'].map(key=>[key,new Set(project.links.filter(link=>active.has(link.supplierId)&&link[key]&&link[key]<=cutoff).map(link=>link.supplierId)).size]));
 const warned=initial.projects.filter(project=>{const counts=projectCounts(project);return counts.reserved<5||counts.admitted<3});
 assert(warned.length>0&&warned.length<initial.projects.length,'同时包含预警及已达标项目，验证过滤效果');
 assert.deepEqual(await root.locator('.scp-project-table [data-project]').evaluateAll(nodes=>nodes.map(node=>+node.dataset.project)),warned.map(project=>project.id));
 for(const project of warned)assert.equal(await root.locator(`[data-project="${project.id}"] .prodname small`).innerText(),'采购链主：'+(project.procurementLead||'—'));
 const help=root.locator('[data-scp-sourcing-help]'),tip=page.locator('#metric-tooltip');
 await help.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await help.hover();await tip.waitFor({state:'visible'});assert.equal(await tip.locator('h4').innerText(),'产品寻源预警');assert.deepEqual(await tip.locator('.scp-sourcing-rule strong').allTextContents(),['＜5','＜3']);assert.equal(await tip.locator('.scp-sourcing-or').innerText(),'或');assert.match(await tip.innerText(),/仅展示满足任一条件的项目/);
 await page.keyboard.press('Escape');await help.focus();assert(await tip.isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Enter');assert(await tip.isVisible());await page.keyboard.press('Escape');await page.mouse.move(0,0);
 // 项目搜索、排序及真实项目详情入口
 const search=root.locator('[data-scp-query="project"]');await search.fill('不存在的寻源项目');assert.match(await root.locator('.scp-project-table').innerText(),/暂无数据/);await search.fill('');
 await root.locator('.scp-project-table [data-rp-sort="reserved"]').click();let counts=await root.locator('.scp-project-table tbody tr td:nth-child(2)').allTextContents();assert(counts.every((n,i)=>!i||+counts[i-1]>=+n));await root.locator('.scp-project-table [data-rp-sort="reserved"]').click();await root.locator('.scp-project-table [data-rp-sort="reserved"]').click();
 const projectId=await root.locator('[data-project]').first().getAttribute('data-project');await root.locator('[data-project]').first().click();assert((await page.locator('#dialogtitle').innerText()).includes(initial.projects.find(p=>String(p.id)===projectId).name));await page.locator('#close').click();
 // 每个可点击数量必须等于下钻的去重供应商明细数量
 const firstCount=root.locator('.scp-project-table [data-scp-members]').first(),expected=+(await firstCount.innerText());await firstCount.click();
 assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),expected);assert.equal(await page.locator('#dialogbody>.product-detail-image').count(),0,'供应商明细不重复插入项目图片标题');
 const supplierId=await page.locator('.scp-member-table [data-scp-supplier-row]').first().getAttribute('data-scp-supplier-row'),supplier=initial.companies.find(s=>s.id===supplierId),memberSearch=page.locator('[data-scp-member-search]');
 await memberSearch.fill(supplier.name);assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),1);await page.locator('[data-scp-supplier-view]').first().click();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#metric-tooltip').innerText(),'跳转至供应商详情页');assert.equal(await page.locator('#dialogtitle').innerText(),'供应商列表');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');await page.keyboard.press('Escape');await page.locator('#close').click();
 // 三级类目字典、空供应商下钻、独立年份选择
 await verifyCategoryWarning(page,root,audit);
 const categorySearch=root.locator('[data-scp-query="category"]');await categorySearch.fill('可视挖耳勺');assert.equal(await root.locator('.scp-category-table tbody tr').count(),1);const zero=root.locator('.scp-category-table tbody tr').first().locator('[data-scp-members]').first();assert.equal(await zero.innerText(),'0');await zero.click();assert.match(await page.locator('.scp-member-results').innerText(),/暂无数据/);await page.locator('#close').click();await categorySearch.fill('');
 await root.locator('.scp-category-table [data-rp-sort="admitted"]').click();const admitted=await root.locator('.scp-category-table tbody td:nth-child(2)').allTextContents();assert(admitted.every((n,i)=>!i||+admitted[i-1]>=+n));await root.locator('.scp-category-table [data-rp-sort="admitted"]').click();await root.locator('.scp-category-table [data-rp-sort="admitted"]').click();
 await root.locator('[data-scp-period="category"] [data-scp-year]').selectOption('2025');assert.deepEqual((await audit()).categoryPeriod,{year:2025,mode:'year',value:1});await verifyCategoryWarning(page,root,audit);assert.deepEqual((await audit()).materialPeriod,{year:2026,mode:'year',value:1});
 await root.locator('[data-scp-period="category"] [data-scp-year]').selectOption('2026');await verifyCategoryWarning(page,root,audit);
 // 超过20条的明细能够分页，搜索会回到第一页
 const categoryCount=root.locator('.scp-category-chart [data-scp-members]').first(),totalCategory=+(await categoryCount.getAttribute('data-value'));assert(totalCategory>20);await categoryCount.click();
 assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),20);await page.locator('.scp-member-pages [aria-label="下一页"]').click();assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),totalCategory-20);await page.locator('[data-scp-member-search]').fill('温州');assert.equal(await page.locator('.scp-member-pages .list-pagination').getAttribute('data-list-current'),'1');await page.locator('#close').click();
 // 整机季度、年度完成数同源；切年度不是只替换标签
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2025');const past=await audit();assert.equal(past.annual.target,8);assert.equal(past.annual.newCooperation,9);for(const key of ['reserved','admitted','cooperated','newCooperation']){
  const entry=root.locator(`[data-scp-annual-metric="${key}"] [data-scp-members]`),payload=JSON.parse(await entry.getAttribute('data-scp-members'));
  await entry.click();await assertSupplierDateEntry(page,payload);
  assert.equal(+(await page.locator('.scp-member-pages .list-pagination').getAttribute('data-list-total')),past.annual[key],'历史年度下钻与显式日期区间一致');await page.locator('#close').click();
 }
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2026');
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2027');
 const futureEntry=root.locator('[data-scp-annual-metric="newCooperation"] [data-scp-members]'),futurePayload=JSON.parse(await futureEntry.getAttribute('data-scp-members'));await futureEntry.click();await assertSupplierDateEntry(page,futurePayload);assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),0,'未来日期范围不混入现有供方');await page.locator('[data-scp-member-reset]').click();assert.equal(+(await page.locator('.scp-member-pages .list-pagination').getAttribute('data-list-total')),30,'清空未来日期可查看当前完整列表');await page.locator('#close').click();
 await root.locator('[data-scp-period="resource"] [data-scp-year]').selectOption('2026');
 for(const entry of await root.locator('.scp-resource-table tbody tr:first-child [data-scp-members]').all()){
  const total=+(await entry.innerText()),payload=JSON.parse(await entry.getAttribute('data-scp-members'));await entry.click();await assertSupplierDateEntry(page,payload);
  assert.equal(+(await page.locator('.scp-member-pages .list-pagination').getAttribute('data-list-total')),total,'历史季度下钻不丢失当时有效的供方');await page.locator('#close').click();
 }
 assert.deepEqual(await root.locator('.scp-annual [data-up-basic]').allTextContents(),['年度已储备','已准入','年度已合作','新增合作','年度目标合作','实际达成']);
 for(const key of ['reserved','admitted','cooperated','newCooperation']){
  const annual=root.locator('[data-scp-annual-metric="'+key+'"] [data-scp-members]');assert.equal(await annual.innerText(),String(initial.annual[key]));const payload=JSON.parse(await annual.getAttribute('data-scp-members'));await annual.click();await assertSupplierDateEntry(page,payload);assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),Math.min(20,initial.annual[key]));await page.locator('#close').click();
 }
 assert.equal(await root.locator('[data-scp-annual-metric="target"] strong').innerText(),String(initial.annual.target));assert.equal(await root.locator('[data-scp-annual-metric="rate"] strong').innerText(),'90.0%');
 // 品牌树展开、按物料去重、缺口颜色和季度变化
 assert.equal(await root.locator('.scp-material-table thead tr:first-child [colspan="4"]').innerText(),'核心零部件已准入');assert.deepEqual(await root.locator('.scp-material-table thead tr:nth-child(2) th').allTextContents(),['电机','电池','电源线','线路板']);
 const expand=root.locator('.scp-material-table thead th:first-child [data-scp-expand-brands]'),scroll=root.locator('.scp-material-scroll');
 assert.equal(await root.locator('.scp-section-actions [data-scp-expand-brands]').count(),0);
 const height=await scroll.evaluate(el=>el.getBoundingClientRect().height);
 await expand.click();assert.equal(await root.locator('.scp-material-child').count(),25);assert.equal(await expand.innerText(),'全部收起');assert.equal(await scroll.evaluate(el=>el.getBoundingClientRect().height),height);
 assert(await scroll.evaluate(el=>el.scrollHeight>el.clientHeight),'展开后在表格内部滚动');
 await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
 const visible=await expand.evaluate(el=>{const head=el.closest('th').getBoundingClientRect(),area=el.closest('.scp-material-scroll').getBoundingClientRect();return head.top>=area.top-1&&head.bottom<=area.bottom});assert(visible,'滚动后表头展开收起按钮仍可用');
 await expand.click();assert.equal(await root.locator('.scp-material-child').count(),0);assert.equal(await scroll.evaluate(el=>el.getBoundingClientRect().height),height);
 await root.locator('[data-scp-brand="美的"]').click();assert.equal(await root.locator('.scp-material-child').count(),5);assert.equal(await scroll.evaluate(el=>el.getBoundingClientRect().height),height);
 for(const cell of await root.locator('.scp-material-child td:nth-child(2) .scp-count').all()){const n=+(await cell.innerText());assert.equal(await cell.evaluate(e=>e.classList.contains('red')),n<5)}
 const material=root.locator('.scp-material-brand[data-scp-brand-row="美的"] td:nth-child(2) [data-scp-members]'),materialCount=+(await material.innerText());await material.click();assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),Math.min(20,materialCount));await page.locator('#close').click();
 const before=await root.locator('.scp-material-table tbody').innerText();await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');assert.notEqual(await root.locator('.scp-material-table tbody').innerText(),before);assert.deepEqual((await audit()).categoryPeriod,{year:2026,mode:'year',value:1});await root.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2026');
 await root.locator('.scp-material-table [data-rp-sort="cooperated"]').click();const brandValues=await root.locator('.scp-material-brand td:nth-child(6)').allTextContents();assert(brandValues.every((n,i)=>!i||+brandValues[i-1]>=+n));
 const sortButton=root.locator('.scp-material-table [data-rp-sort="cooperated"]');await sortButton.focus();await page.keyboard.press('Enter');assert.equal(await sortButton.getAttribute('data-direction'),'asc');assert(await sortButton.evaluate(e=>e===document.activeElement),'排序后保留键盘焦点');await page.keyboard.press('Enter');
 // 宽表只在内部滚动；抽屉搜索无结果与状态筛选可用
 await material.click();await page.locator('[data-scp-member-search]').fill('不存在的供应商');assert.match(await page.locator('.scp-member-results').innerText(),/暂无数据/);await page.locator('[data-scp-member-search]').fill('');await page.locator('[data-scp-member-status]').selectOption('已合作');assert((await page.locator('.scp-member-table tbody tr [class="scp-state-tag green"]').allTextContents()).every(s=>s==='已合作'));
 for(const width of [1920,1366,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'供应商抽屉不撑宽 '+width)}await page.locator('#close').click();
 for(const width of [1920,1366,1024,390]){await page.setViewportSize({width,height:1080});assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'采购模块不撑宽 '+width)}
 await page.setViewportSize({width:1920,height:1080});assert(!/\d+[ \t]*家/.test(await root.innerText()));assert.equal(await root.locator('.metric-help').count(),4);
 console.log('通过：供应商去重及日期台账、年度季度守恒、三卡比例、寻源/类目/品牌筛选排序、物料两层展开、数量下钻及三层详情返回、响应式');
}
