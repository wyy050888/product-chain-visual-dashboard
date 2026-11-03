import assert from 'node:assert/strict';
function expectedCount(a,brand,categoryId,material,range){
 if(range.future)return 0;
 const members=a.brands[brand],active=new Map(a.companies.map(s=>[s.id,s])),dates=new Map();
 for(const row of a.capabilities){
  const supplier=active.get(row.supplierId);
  if(!supplier||supplier.reserved>range.cutoff||supplier.disabled&&supplier.disabled<=range.cutoff||row.kind!=='material'||!members.includes(row.brand)||!(Array.isArray(categoryId)?categoryId:[categoryId]).includes(row.categoryId)||row.material!==material||!row.admitted||row.admitted>range.cutoff)continue;
  const old=dates.get(row.supplierId);if(!old||row.admitted<old)dates.set(row.supplierId,row.admitted);
 }
 return [...dates.values()].filter(date=>date>=range.start).length;
}
export async function verifySupplierMaterialTables(page,root){
 const audit=()=>page.evaluate(()=>supplierPlanningAudit()),names=['个护类','环境类','清洁类','厨电类','健康类'];
 const summary=root.locator('.scp-material-summary-table');
 assert.deepEqual(await summary.locator('thead th').allTextContents(),['类目','品牌','电机','电池','电源线','线路板','塑料件','包装','操作']);
 assert.deepEqual(await summary.locator('.scp-material-summary-category').allTextContents(),names);
 assert.equal(await summary.locator('tbody tr').count(),15);
 await summary.screenshot({path:'outputs/supplier-revision-20261030/material-summary.png'});
 assert.equal(await summary.locator('.scp-admission-pair').count(),0,'首页仅数量，不显示目标或达成');
 const checkSummary=async()=>{
  const a=await audit(),range=a.coverage[0].range;
  for(const row of await summary.locator('tbody tr').all()){
   const category=await row.getAttribute('data-scp-material-summary'),brand=await row.getAttribute('data-scp-summary-brand'),ids=a.categories.filter(c=>c.category===category).map(c=>c.id);
   assert.equal(await row.locator('.scp-material-summary-brand').innerText(),brand);
   for(const cell of await row.locator('[data-scp-summary-material]').all())assert.equal(await cell.innerText(),range.future?'—':String(expectedCount(a,brand,ids,await cell.getAttribute('data-scp-summary-material'),range))+'家','外侧按一级类目、品牌、物料跨三级类目去重');
  }
 };
 await checkSummary();
 const check=async category=>{
  await root.locator('[data-scp-material-view='+JSON.stringify(category)+']').click();
  const drawer=page.locator('[data-scp-drawer="material-list"]'),table=drawer.locator('.scp-material-detail-table'),a=await audit(),range=a.coverage[0].range;
  assert.equal(await drawer.locator('[role=tab][aria-selected=true]').innerText(),category);
  assert.deepEqual(await drawer.locator('[role=tab]').allTextContents(),['全部',...names]);
  assert.deepEqual(await table.locator('thead th').allTextContents(),['三级类目','品牌','电机','电池','电源线','线路板','塑料件','包装']);
  await page.screenshot({path:'outputs/supplier-revision-20261030/material-category-drawer.png'});
  const initialPeriod=JSON.stringify(a.materialPeriod);
  for(const name of names){
   await drawer.locator('[data-scp-category-tab='+JSON.stringify(name)+']').click();
   const expected=a.categories.filter(c=>c.category===name).flatMap(category=>a.materials.flatMap(brand=>brand.categories.filter(row=>row.categoryId===category.id).map(row=>({brand:brand.brand,category,stats:row.stats}))));
   const pager=drawer.locator('.scp-material-pages .list-pagination'),size=Number(await pager.getAttribute('data-list-size'));assert.equal(Number(await pager.getAttribute('data-list-total')),expected.length);assert.equal(await table.locator('.scp-material-row').count(),Math.min(expected.length,size));
   for(const row of await table.locator('.scp-material-row').all()){
    const brand=await row.getAttribute('data-scp-brand-row'),id=await row.getAttribute('data-scp-category-row'),item=expected.find(item=>item.brand===brand&&item.category.id===id);assert(item);
    const group=table.locator('[data-scp-category-row='+JSON.stringify(id)+']');assert.equal(await group.locator('.scp-material-category-cell').count(),1);assert.equal(+(await group.locator('.scp-material-category-cell').getAttribute('rowspan')),await group.count());assert((await group.locator('.scp-material-category-cell').innerText()).includes(item.category.name));assert.equal(await row.locator('.scp-material-brand-cell').innerText(),brand);
    for(const [i,material]of ['电机','电池','电源线','线路板','塑料件','包装'].entries()){
     const cell=row.locator('.scp-material-component-cell').nth(i),target=item.stats.targets[material];
     if(!Number.isFinite(target)){assert.equal(await cell.innerText(),'无目标');assert.equal(await cell.locator('button').count(),0);continue}
     assert.equal((await cell.innerText()).replace(/\s/g,''),expectedCount(a,brand,id,material,range)+'/'+target,'当前组合去重新增与计划目标');
     assert.equal(await cell.locator('button,[data-scp-jump],[data-jump-toast]').count(),0,'导入供应商数量只读，无跳转提示');
    }
   }
   if(!expected.length)assert.match(await table.innerText(),/暂无核心物料供应商/);
  }
  const planned=a.categories.find(c=>a.materials.some(b=>b.categories.some(row=>row.categoryId===c.id)));
  if(planned){
   await drawer.locator('[data-scp-category-tab='+JSON.stringify(planned.category)+']').click();const search=drawer.locator('[data-scp-material-search]');await search.fill(planned.name);
   assert(await table.locator('.scp-material-row').count()>0);assert.equal(await table.locator('.scp-material-category-cell').count(),1,'搜索后保留合并单元格');assert((await table.locator('.scp-material-row').evaluateAll(rows=>rows.map(row=>row.dataset.scpCategoryRow))).every(id=>id===planned.id));
   await search.fill('不存在的三级类目');assert.equal(await table.locator('.scp-material-row').count(),0);assert.match(await table.innerText(),/没有符合筛选条件的数据/);await drawer.locator('[data-scp-category-tab="健康类"]').click();assert.equal(await search.inputValue(),'不存在的三级类目','切Tab保留搜索');await search.fill('');
  }
  const before=await table.locator('tbody tr').allTextContents();for(let i=0;i<3;i++)await table.locator('[data-rp-sort="电机"]').click();assert.deepEqual(await table.locator('tbody tr').allTextContents(),before);
  assert.equal(JSON.stringify((await audit()).materialPeriod),initialPeriod,'切Tab和排序不改首页期间');
  for(const width of [1920,1366,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));if(width>1000)assert(await drawer.locator('.scp-member-results').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'桌面8列不横滚')}
  await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 };
 await check('清洁类');
 const period=root.locator('[data-scp-period="material"]');assert.equal(await period.locator('[data-scp-mode],[data-scp-quarter]').count(),0);await period.locator('[data-scp-year]').selectOption('2025');await checkSummary();await check('个护类');await period.locator('[data-scp-year]').selectOption('2026');
 console.log('通过：首页类目/品牌/六物料去重数量且无目标、查看定位Tab、三级类目合并/搜索、六核心件统计/年度目标、排序/只读数量及宽窄屏。');
}
export async function supplierMaterialRows(page){await page.evaluate(()=>location.hash='#suppliers');await verifySupplierMaterialTables(page,page.locator('#suppliers'))}

export async function supplierMaterialBrand(page){
 await page.evaluate(()=>location.hash='#suppliers');await page.locator('[data-scp-material-view="清洁类"]').click();
 const drawer=page.locator('[data-scp-drawer="material-list"]'),search=drawer.locator('[data-scp-material-search]'),table=drawer.locator('.scp-material-detail-table'),brand=drawer.locator('[data-scp-material-brand]'),multi=drawer.locator('.pf-multi[data-pf-multi-label="品牌"]');
 const before=await page.evaluate(()=>JSON.stringify(supplierPlanningAudit().materialPeriod));
 assert.deepEqual(await brand.locator('option').allTextContents(),['全部','美海','康创','苏泊尔']);
 const searchBox=await search.boundingBox(),brandBox=await multi.boundingBox();assert(searchBox.width<=340&&searchBox.width>=250);assert(Math.abs(searchBox.y-brandBox.y)<5,'搜索和品牌同排');
 await search.fill('吸尘器');assert.equal(await table.locator('.scp-material-row').count(),3);
 await multi.locator('[data-pf-multi-trigger]').click();await multi.locator('[data-pf-multi-option][value="美海"]').check();
 assert.equal(await table.locator('.scp-material-row').count(),1);assert.equal(await table.locator('.scp-material-brand-cell').innerText(),'美海');assert.equal(await table.locator('.scp-material-category-cell').getAttribute('rowspan'),'1');
 await multi.locator('[data-pf-multi-option][value="康创"]').check();assert.equal(await table.locator('.scp-material-row').count(),2);assert.equal(await table.locator('.scp-material-category-cell').getAttribute('rowspan'),'2');
 await drawer.locator('[data-scp-category-tab="环境类"]').click();assert.equal(await search.inputValue(),'吸尘器');assert.equal(await table.locator('.scp-material-row').count(),0);assert.match(await table.innerText(),/没有符合筛选条件的数据/);
 await search.fill('');assert((await table.locator('.scp-material-brand-cell').allTextContents()).every(value=>['美海','康创'].includes(value)));
 await table.locator('[data-rp-sort="电机"]').click();assert.deepEqual(await brand.evaluate(e=>Array.from(e.selectedOptions,o=>o.value)),['美海','康创'],'排序保留品牌');
 await multi.locator('[data-pf-multi-trigger]').click();await multi.locator('[data-pf-multi-option][value="all"]').check();assert((await table.locator('.scp-material-brand-cell').allTextContents()).includes('苏泊尔'));
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'筛选栏不撑宽抽屉 '+width);assert((await search.boundingBox()).width<= (await drawer.boundingBox()).width)}
 assert.equal(await page.evaluate(()=>JSON.stringify(supplierPlanningAudit().materialPeriod)),before,'筛选不改首页年度');await page.locator('#close').click();
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-scp-material-view="清洁类"]').click();assert.equal(await drawer.locator('[data-scp-material-search]').inputValue(),'');assert.deepEqual(await drawer.locator('[data-scp-material-brand]').evaluate(e=>Array.from(e.selectedOptions,o=>o.value)),['all'],'重新进入默认全部');
 console.log('通过：短搜索框、品牌多选与搜索组合、Tab/排序条件保留、合并行数及宽窄屏。');
}

export async function supplierMaterialSummarySort(page){
 await page.evaluate(()=>location.hash='#suppliers');
 const table=page.locator('.scp-material-summary-table'),read=()=>table.locator('tbody tr').evaluateAll(rows=>rows.map(row=>({category:row.dataset.scpMaterialSummary,brand:row.dataset.scpSummaryBrand,counts:Object.fromEntries([...row.querySelectorAll('[data-scp-summary-material]')].map(cell=>[cell.dataset.scpSummaryMaterial,cell.textContent.trim()]))})));
 const initial=await read(),categories=['个护类','环境类','清洁类','厨电类','健康类'],materials=['电机','电池','电源线','线路板','塑料件','包装'];
 assert.equal(await table.locator('[data-scp-sort="materialSummary"]').count(),6);
 const groups=async()=>{assert.deepEqual(await table.locator('.scp-material-summary-category').allTextContents(),categories);assert.equal(await table.locator('[data-scp-material-view]').count(),5);assert((await table.locator('.scp-material-summary-category,.scp-material-summary-operation').evaluateAll(nodes=>nodes.map(n=>n.rowSpan))).every(span=>span===3))};
 await groups();assert(initial.every(row=>Object.values(row.counts).every(text=>/^\d+家$/.test(text))),'含零值都显示家');
 for(const material of materials){
  for(const direction of ['desc','asc','']){
   await table.locator('[data-rp-sort="'+material+'"]').click();
   const expected=categories.flatMap(category=>{const rows=initial.filter(r=>r.category===category);return direction?rows.sort((a,b)=>(direction==='asc'?1:-1)*(parseInt(a.counts[material])-parseInt(b.counts[material]))):rows});
   assert.deepEqual(await read(),expected,material+' '+direction+'按真实数值组内排序');await groups();
   assert.equal(await table.locator('[data-rp-sort="'+material+'"]').evaluate(el=>el.closest('th').getAttribute('aria-sort')),direction==='desc'?'descending':direction==='asc'?'ascending':'none');
  }
 }
 await table.locator('[data-rp-sort="电机"]').click();await page.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2025');
 assert.equal(await table.locator('[data-rp-sort="电机"]').getAttribute('data-direction'),'desc','切年保留排序');
 const facts=await page.evaluate(()=>supplierPlanningAudit()),range=facts.coverage[0].range;
 for(const row of await read()){const ids=facts.categories.filter(c=>c.category===row.category).map(c=>c.id);for(const material of materials)assert.equal(row.counts[material],expectedCount(facts,row.brand,ids,material,range)+'家')}
 await table.locator('[data-scp-material-view="清洁类"]').click();assert((await page.locator('.scp-material-detail-table [data-rp-sort]').evaluateAll(nodes=>nodes.map(n=>n.dataset.direction))).every(value=>value===''),'首页与抽屉排序独立');await page.locator('#close').click();
 await page.locator('[data-scp-period="material"] [data-scp-year]').selectOption('2027');assert((await read()).every(row=>Object.values(row.counts).every(text=>text==='—')),'未来缺失不显示0家');await groups();
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'排序单位不撑宽页面 '+width)}
 console.log('通过：六列分组排序/稳定同值/恢复默认、数量单位、年份与未来空值、类目合并和独立排序。');
}
