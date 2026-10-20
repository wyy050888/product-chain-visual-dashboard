import {setSupplierDate,assertSupplierDateEntry,verifySupplierDateFilters} from './supplier-date-filters.mjs';
import assert from 'node:assert/strict';
async function collectSuppliers(page){
 const ids=[];
 for(let guard=0;guard<10;guard++){
  ids.push(...await page.locator('.scp-member-table [data-scp-supplier-row]').evaluateAll(rows=>rows.map(row=>row.dataset.scpSupplierRow)));
  const next=page.locator('.scp-member-pages [aria-label="下一页"]');if(!await next.count()||await next.isDisabled())break;await next.click();
 }
 assert.equal(new Set(ids).size,ids.length,'跨页供应商按身份去重');return ids.sort();
}
export async function verifySupplierLists(page,root,audit){
 const a=await audit(),cutoff='2026-10-10',active=kind=>a.companies.filter(s=>s.kinds.includes(kind)&&s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)),field=key=>page.locator(`[data-scp-member-filter="${key}"]`);
 const materialMenu=page.locator('[data-pf-multi-label="合作物料"]');
 const chooseMaterials=async names=>{await materialMenu.locator('summary').click();await materialMenu.locator('[data-pf-multi-option][value="all"]').check();for(const name of names)await materialMenu.locator(`[data-pf-multi-option][value="${name}"]`).check();await materialMenu.locator('summary').click()};
 const count=root.locator('.scp-project-table [data-scp-members]').first(),payload=JSON.parse(await count.getAttribute('data-scp-members'));await count.click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'供应商列表');assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),['整机供应商','物料供应商']);assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'machine');assert.equal(await page.locator('[data-scp-member-search]').inputValue(),a.projects.find(p=>String(p.id)===String(payload.scope.id)).name);assert.equal(await page.locator('#dialogsub').innerText(),'');assert.equal(await field('project').count(),0);await assertSupplierDateEntry(page,payload);assert.equal(await field('status').inputValue(),'all');
 assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),+(await count.innerText()),'入口数字只设初始筛选且数量一致');
 await page.locator('[data-scp-member-reset]').click();assert.equal(await page.locator('[data-scp-member-search]').inputValue(),'');assert.equal(await field('status').inputValue(),'all');assert.deepEqual(await collectSuppliers(page),active('machine').map(s=>s.id).sort(),'重置可看全部有效整机供应商');
 const headers=['供应商信息','供应商状态','合作品牌','合作类目','供应商星级','注册日期','储备日期','准入日期','合作日期','负责采购','操作'];
 assert.deepEqual(await page.locator('.scp-member-table thead th').allTextContents(),headers);
 assert.deepEqual(await field('stars').locator('option').allTextContents(),['全部','一星','二星','三星']);
 assert.deepEqual(await field('status').locator('option').allTextContents(),['全部','已储备','已准入','已合作']);
 await verifySupplierDateFilters(page,a.companies.filter(s=>s.kinds.includes('machine')&&s.reserved<=cutoff),collectSuppliers);
 const alignment=await page.locator('.scp-member-table').evaluate(table=>[...table.tHead.rows[0].cells].map((th,i)=>({head:getComputedStyle(th).textAlign,body:getComputedStyle(table.tBodies[0].rows[0].cells[i]).textAlign})));
 assert(alignment.every(c=>c.head===c.body),'每列表头与内容对齐一致');
 assert.deepEqual(alignment.map(c=>c.head),['left','center','left','left','center','center','center','center','center','left','center']);

 await page.locator('[data-scp-member-search]').fill('GY-');assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),0,'编码不参与整机供应商搜索');
 await page.locator('[data-scp-member-search]').fill(a.projects[0].name);assert.deepEqual(await collectSuppliers(page),[...new Set(a.projects[0].links.filter(link=>active('machine').some(s=>s.id===link.supplierId)&&link.reserved<=cutoff).map(link=>link.supplierId))].sort(),'按项目名称搜索关联供应商');
 await page.locator('[data-scp-member-reset]').click();await field('stars').selectOption('3');assert.deepEqual(await collectSuppliers(page),active('machine').filter(s=>s.stars===3).map(s=>s.id).sort(),'三星筛选使用独立星级字段');
 await page.locator('[data-scp-member-reset]').click();
 const picker=page.locator('.scp-category-picker');await picker.locator('summary').click();assert.equal(await picker.locator('.scp-cascade-column').count(),3);await picker.locator('[data-scp-category-branch="1"][data-value="个护类"]').click();await picker.locator('[data-scp-category-branch="2"][data-value="男士理容"]').click();
 await picker.locator('[data-scp-category-leaf]').filter({hasText:'鼻毛修剪器'}).click();assert.equal(await picker.locator('.scp-category-value').innerText(),'个护类 / 男士理容 / 鼻毛修剪器');
 const leaf=a.categories.find(c=>c.name==='鼻毛修剪器');assert.deepEqual(await collectSuppliers(page),[...new Set(a.capabilities.filter(r=>r.kind==='machine'&&r.categoryId===leaf.id&&r.reserved<=cutoff&&active('machine').some(s=>s.id===r.supplierId)).map(r=>r.supplierId))].sort(),'级联末级选择对应同一份字典');
 await picker.locator('summary [data-scp-category-clear]').click();assert.equal(await picker.locator('.scp-category-value').innerText(),'全部');assert.deepEqual(await collectSuppliers(page),active('machine').map(s=>s.id).sort());
 const brandName=await field('brand').locator('option').nth(1).getAttribute('value');await field('brand').selectOption(brandName);await field('status').selectOption('已合作');
 const brandSuppliers=new Set(a.projects.filter(p=>p.brand===brandName).flatMap(p=>p.links.filter(link=>link.reserved<=cutoff).map(link=>link.supplierId)));
 assert.deepEqual(await collectSuppliers(page),active('machine').filter(s=>brandSuppliers.has(s.id)&&s.cooperation&&s.cooperation<=cutoff).map(s=>s.id).sort(),'合作品牌与供应商状态交集');
 await page.locator('[data-scp-member-reset]').click();await picker.locator('summary').click();await picker.locator('[data-scp-category-level="1"][value="环境类"]').check();
 assert.deepEqual(await collectSuppliers(page),[...new Set(a.capabilities.filter(r=>r.kind==='machine'&&r.category==='环境类'&&r.reserved<=cutoff&&active('machine').some(s=>s.id===r.supplierId)).map(r=>r.supplierId))].sort(),'父级类目可覆盖全部下级');await page.locator('[data-scp-member-reset]').click();
 // 保存一类的搜索排序；另一类可以独立筛选，再切回仍保留原状态。
 await page.locator('[data-scp-member-search]').fill('宁波');await page.locator('.scp-member-table [data-rp-sort="admitted"]').click();const machineIds=await collectSuppliers(page);
 await page.locator('#drawer-tabs [data-drawer-tab="machine"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'material');assert.equal(await page.locator('[data-scp-member-search]').inputValue(),'');assert.equal(await field('brand').inputValue(),'all');assert.deepEqual(await collectSuppliers(page),active('material').map(s=>s.id).sort(),'物料Tab展示完整供应商池');

 assert.equal(await page.locator('.scp-member-table thead th').first().innerText(),'供应商信息');assert.equal(await page.locator('.scp-member-table tbody td:first-child small').count(),0);
 assert.equal(await page.locator('[data-scp-member-search]').getAttribute('placeholder'),'供应商名称 / 项目名称');
 await page.locator('[data-scp-member-search]').fill('GY-');assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),0,'物料编码不参与名称搜索');await page.locator('[data-scp-member-search]').fill('');
 const materialHeaders=[...headers.slice(0,4),'合作物料',...headers.slice(4)];assert.deepEqual(await page.locator('.scp-member-table thead th').allTextContents(),materialHeaders);
 assert.deepEqual(await field('material').locator('option').allTextContents(),['全部','电池','电机','电源线','线路板','塑料件','硅胶件','五金件','其他']);
 assert(await page.locator('.scp-cooperation-text').evaluateAll(nodes=>nodes.every(e=>getComputedStyle(e).overflow==='hidden'&&e.getBoundingClientRect().right<=e.parentElement.getBoundingClientRect().right+1)),'合作品牌/类目/物料长文本限制在本列');
 assert.deepEqual(await field('status').locator('option').allTextContents(),['全部','已储备','已准入','已合作']);
 const materialAlignment=await page.locator('.scp-member-table').evaluate(table=>[...table.tHead.rows[0].cells].map((th,i)=>getComputedStyle(th).textAlign===getComputedStyle(table.tBodies[0].rows[0].cells[i]).textAlign));assert(materialAlignment.every(Boolean),'物料新增列后所有字段对齐一致');
 const materialActive=new Set(active('material').map(s=>s.id));
 await chooseMaterials(['塑料件','硅胶件']);const extraExpected=[...new Set(a.capabilities.filter(r=>r.kind==='material'&&['塑料件','硅胶件'].includes(r.material)&&r.reserved<=cutoff&&materialActive.has(r.supplierId)).map(r=>r.supplierId))].sort();assert(extraExpected.length>0&&extraExpected.length<materialActive.size);assert.deepEqual(await collectSuppliers(page),extraExpected,'合作物料多选按并集去重');
 await page.locator('[data-scp-member-reset]').click();await field('stars').selectOption('3');assert.deepEqual(await collectSuppliers(page),active('material').filter(s=>s.stars===3).map(s=>s.id).sort(),'物料支持同一星级筛选');await page.locator('[data-scp-member-reset]').click();
 const relation=a.capabilities.find(r=>r.kind==='material'&&r.reserved<=cutoff&&materialActive.has(r.supplierId)),materialLeaf=a.categories.find(c=>c.id===relation.categoryId);
 await picker.locator('summary').click();await picker.locator(`[data-scp-category-branch="1"][data-value="${materialLeaf.category}"]`).click();await picker.locator(`[data-scp-category-branch="2"][data-value="${materialLeaf.group}"]`).click();await picker.locator(`[data-scp-category-leaf][data-value="${materialLeaf.id}"]`).click();
 assert.deepEqual(await collectSuppliers(page),[...new Set(a.capabilities.filter(r=>r.kind==='material'&&r.categoryId===materialLeaf.id&&r.reserved<=cutoff&&materialActive.has(r.supplierId)).map(r=>r.supplierId))].sort(),'物料采用相同三级类目级联');await page.locator('[data-scp-member-reset]').click();
 const linkedProject=a.projects.find(p=>p.links.some(r=>r.reserved<=cutoff&&materialActive.has(r.supplierId)));await page.locator('[data-scp-member-search]').fill(linkedProject.name);assert.deepEqual(await collectSuppliers(page),[...new Set(linkedProject.links.filter(r=>r.reserved<=cutoff&&materialActive.has(r.supplierId)).map(r=>r.supplierId))].sort(),'物料支持关联项目名称搜索');await page.locator('[data-scp-member-reset]').click();
 await field('brand').selectOption('美的');await chooseMaterials(['电机']);await setSupplierDate(page,'admitted','2000-01-01','2026-10-10');
 const valid=new Set(active('material').map(s=>s.id)),expected=[...new Set(a.capabilities.filter(row=>row.kind==='material'&&row.brand==='美的'&&row.material==='电机'&&valid.has(row.supplierId)&&row.admitted&&row.admitted<=cutoff).map(row=>row.supplierId))].sort();assert.deepEqual(await collectSuppliers(page),expected,'品牌、物料及准入日期组合筛选');
 await page.locator('#drawer-tabs [data-drawer-tab="machine"]').click();assert.equal(await page.locator('[data-scp-member-search]').inputValue(),'宁波');assert.equal(await page.locator('.scp-member-table [data-rp-sort="admitted"]').getAttribute('data-direction'),'desc');assert.deepEqual(await collectSuppliers(page),machineIds);
 await page.locator('#drawer-tabs [data-drawer-tab="material"]').click();assert.equal(await field('brand').inputValue(),'美的');assert.equal(await field('material').inputValue(),'电机');assert.deepEqual(await collectSuppliers(page),expected);
 await page.locator('[data-scp-member-search]').fill('不存在的供应商');assert.equal(await page.locator('.scp-member-table [data-scp-supplier-row]').count(),0);await page.locator('[data-scp-member-reset]').click();
 const depth=await page.locator('#dialog').getAttribute('data-drawer-depth');
 await page.locator('[data-scp-supplier-view]').first().click();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#metric-tooltip').innerText(),'跳转至供应商详情页');assert.equal(await page.locator('#dialogtitle').innerText(),'供应商列表');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),depth,'物料查看不新开详情抽屉');await page.keyboard.press('Escape');assert(await page.locator('#metric-tooltip').isHidden());assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'material');assert.equal(await page.locator('[data-scp-date=admitted] [data-scp-date-to]').inputValue(),'');

 for(const width of [1366,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'统一列表筛选不撑宽 '+width)}await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 // 从物料缺口下钻也进入同一双Tab列表；整机Tab不继承物料入口条件。
 await root.locator('[data-scp-coverage]').first().click();const cell=page.locator('.scp-coverage-table [data-scp-members]').first(),scope=JSON.parse(await cell.getAttribute('data-scp-members')).scope;await cell.click();assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'material');assert.equal(await field('brand').inputValue(),scope.brand);assert.equal(await field('material').inputValue(),scope.material);assert.equal(await page.locator('.scp-category-picker .scp-category-value').innerText(),scope.category);
 await page.locator('#drawer-tabs [data-drawer-tab="machine"]').click();assert.equal(await page.locator('[data-scp-member-search]').inputValue(),'');assert.deepEqual(await collectSuppliers(page),active('machine').map(s=>s.id).sort());await page.locator('.drawer-back').click();assert.equal(await page.locator('.scp-coverage-table tbody tr').count(),5);await page.locator('#close').click();
 console.log('通过：整机/物料完整列表切换、入口条件可清除、双Tab独立筛选排序分页、品牌物料组合及逐层返回');
}
