import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function supplierCatalogFilters(page){
 const ctx=vm.createContext({scpCategories:[{id:'admit',path:'A / B / C'},{id:'cooperate',path:'X / Y / Z'}],pfIncludes:(value,actual)=>value==='all'||(Array.isArray(value)?value:[value]).includes(actual)});
 const code=fs.readFileSync(new URL('../../src/modules/strategic-supplier-import/06-catalog-filters.js',import.meta.url),'utf8');vm.runInContext(code.slice(0,code.indexOf('function ssiCatalogFilterNames')),ctx);
 const relation={tier:'secondary',admissionCategory:'A / B / C',admissionMaterial:'电机',availableBrand:'甲',categoryPath:'X / Y / Z',cooperationMaterial:'电池',brand:'乙'};
 assert(ctx.ssiMatchesCatalog(relation,{category:'admit',brand:['甲']}));assert(!ctx.ssiMatchesCatalog(relation,{category:'cooperate',brand:['乙']}),'二级不通过合作信息命中');assert(!ctx.ssiMatchesCatalog(relation,{category:'admit',brand:['乙']}),'不能用合作品牌跨字段命中');

 assert(ctx.ssiMatchesCatalog(relation,{category:'admit',brand:['甲'],material:['电机','电源线']}),'准入物料多选取并集');
 assert(!ctx.ssiMatchesCatalog(relation,{category:'admit',brand:['甲'],material:['电池']}),'合作物料不能使准入物料筛选命中');
 assert(ctx.ssiMatchesCatalog({...relation,tier:'primary'},{category:'cooperate',brand:['乙'],material:['电源线']}),'一级关系不受隐藏物料条件影响');

 await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('[data-ssi-tier="primary"]').click();await page.locator('#ssi-reset').click();
 assert.equal(await page.locator('#ssi-status,#ssi-status-field').count(),0,'不再展示供应商状态筛选');
 const audit=()=>page.evaluate(()=>strategicSupplierImportAudit()),initial=(await audit()).rows,row=initial.find(row=>row.categoryPath&&row.brand);assert(row);
 const options=await page.locator('#ssi-brand option').allTextContents();assert(options.includes(row.brand));
 await page.locator('#ssi-query').fill(row.name);assert.deepEqual(await page.locator('#ssi-brand option').allTextContents(),options,'品牌库不随当前结果缩小');
 await page.locator('#ssi-reset').click();const brand=page.locator('.pf-multi').filter({has:page.locator('#ssi-brand')});await brand.locator('summary').click();await brand.locator('[data-pf-multi-option][value='+JSON.stringify(row.brand)+']').check();await brand.locator('summary').click();assert((await audit()).rows.every(r=>r.brand===row.brand));
 const choose=async path=>{await page.locator('[data-ssi-category-trigger]').click();for(const [level,name]of path.entries()){const option=page.locator('[data-ssi-category-level="'+level+'"][data-ssi-category-name='+JSON.stringify(name)+']');if(level<2)await option.locator('[data-ssi-category-branch]').click();else await option.locator('input').check()}await page.keyboard.press('Escape')};
 const path=row.categoryPath.split(' / ');await choose(path);
 assert((await audit()).rows.length>0);assert((await audit()).rows.every(r=>r.brand===row.brand&&r.categoryPath===row.categoryPath),'类目与品牌按同一行取交集');
 await page.locator('[data-ssi-category-trigger]').click();const panel=page.locator('#ssi-category-panel');assert.equal(await panel.locator('h4,.ssi-category-footer').count(),0,'去掉旧表头和全部类目页脚');
 const parent=panel.locator('[data-ssi-category-level="0"][data-ssi-category-name='+JSON.stringify(path[0])+'] input');assert(await parent.evaluate(input=>input.indeterminate),'仅部分三级类目选中时一级半选');
 await parent.check();assert((await audit()).rows.every(r=>r.categoryPath.startsWith(path[0]+' / ')),'勾选一级匹配全部下级类目');
 const others=await panel.locator('[data-ssi-category-level="0"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.ssiCategoryName));const other=others.find(name=>name!==path[0]),secondParent=panel.locator('[data-ssi-category-level="0"][data-ssi-category-name='+JSON.stringify(other)+'] input');
 await secondParent.check();assert((await audit()).rows.every(r=>[path[0],other].some(name=>r.categoryPath.startsWith(name+' / '))),'类目支持跨分支多选');await parent.uncheck();await secondParent.uncheck();await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-ssi-category-label]').textContent(),'请选择','取消最后一项恢复不限制');
 await choose(path);

 await page.locator('#ssi-query').fill(row.name);assert((await audit()).rows.every(r=>r.name.includes(row.name)));assert.deepEqual(await page.locator('#ssi-brand option').allTextContents(),options);
 await page.locator('[data-ssi-tier="secondary"]').click();await page.locator('[data-ssi-tier="primary"]').click();assert.equal(await page.locator('#ssi-brand').inputValue(),row.brand);assert.equal(await page.locator('[data-ssi-category-label]').textContent(),row.categoryPath,'Tab独立保留条件');
 await page.locator('[data-ssi-category-trigger]').click();await page.locator('[data-ssi-category-level="0"]').last().click();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-ssi-category-label]').textContent(),row.categoryPath,'未选完整路径不覆盖已选条件');
 await page.locator('#ssi-query').fill(row.categoryPath);assert.equal((await audit()).rows.length,0,'类目不再通过文本搜索匹配');
 await page.locator('[data-ssi-tier="secondary"]').click();await page.locator('#ssi-reset').click();
 assert.equal(await page.locator('[data-ssi-category-trigger] .unified-field-name').innerText(),'准入类目');
 assert.equal(await page.locator('.pf-multi:has(#ssi-brand) .unified-field-name').innerText(),'可合作品牌');
 const secondary=(await audit()).rows.find(r=>r.admissionCategory&&r.availableBrand);assert(secondary);await choose(secondary.admissionCategory.split(' / '));
 const secondBrand=page.locator('.pf-multi:has(#ssi-brand)');await secondBrand.locator('summary').click();await secondBrand.locator('[data-pf-multi-option][value='+JSON.stringify(secondary.availableBrand)+']').check();await secondBrand.locator('summary').click();
 assert((await audit()).rows.length>0);assert((await audit()).rows.every(r=>r.admissionCategory===secondary.admissionCategory&&r.availableBrand===secondary.availableBrand));
 const materialMenu=page.locator('#ssi-material-field .pf-multi'),materialOptions=await page.locator('#ssi-material option').allTextContents();
 const catalog=fs.readFileSync(new URL('../../src/modules/supplier-planning/00-reference.js',import.meta.url),'utf8').match(/const scpCooperationMaterials=(\[[^;]+\]);/);assert(catalog);
 assert.deepEqual(materialOptions,['全部',...vm.runInNewContext(catalog[1])],'准入物料使用完整现有目录');
 const pickMaterials=async values=>{await materialMenu.locator('summary').click();await materialMenu.locator('[data-pf-multi-option][value="all"]').check();for(const value of values)await materialMenu.locator('[data-pf-multi-option][value='+JSON.stringify(value)+']').check();await page.keyboard.press('Escape')};
 await pickMaterials([secondary.admissionMaterial]);
 assert((await audit()).rows.length>0);assert((await audit()).rows.every(r=>r.admissionMaterial===secondary.admissionMaterial&&r.admissionCategory===secondary.admissionCategory&&r.availableBrand===secondary.availableBrand),'物料、类目、品牌取同一准入关系交集');
 const otherMaterial=materialOptions.find(name=>name!=='全部'&&name!==secondary.admissionMaterial);
 await page.locator('#ssi-query').fill(secondary.name);await pickMaterials([otherMaterial]);assert.equal((await audit()).rows.length,0);assert.match(await page.locator('#ssi-body').innerText(),/没有符合筛选条件的数据/);
 assert.deepEqual(await page.locator('#ssi-material option').allTextContents(),materialOptions,'物料候选不随结果缩减');
 await page.locator('#ssi-reset').click();const secondaryTotal=(await audit()).rows.length;assert(secondaryTotal>0);
 if(secondaryTotal>20)await page.locator('#ssi-pagination [aria-label="第2页"]').click();await pickMaterials([secondary.admissionMaterial,otherMaterial]);
 assert.equal(await page.locator('#ssi-pagination .list-pagination').getAttribute('data-list-current'),'1','更换物料回第1页');assert((await audit()).rows.every(r=>[secondary.admissionMaterial,otherMaterial].includes(r.admissionMaterial)));
 await page.locator('[data-ssi-tier="primary"]').click();assert(await page.locator('#ssi-material-field').isHidden());
 await page.locator('[data-ssi-tier="secondary"]').click();assert.deepEqual(await page.locator('#ssi-material').evaluate(select=>[...select.selectedOptions].map(option=>option.value).sort()),[secondary.admissionMaterial,otherMaterial].sort(),'Tab切换保留准入物料多选');
 await page.locator('#ssi-reset').click();assert.equal(await page.locator('#ssi-material').inputValue(),'all');assert.equal((await audit()).rows.length,secondaryTotal,'重置物料恢复原范围');
 await page.locator('[data-ssi-tier="primary"]').click();assert.equal(await page.locator('[data-ssi-category-trigger] .unified-field-name').innerText(),'合作类目');assert.equal(await page.locator('.pf-multi:has(#ssi-brand) .unified-field-name').innerText(),'合作品牌');
 await page.locator('#ssi-reset').click();assert.equal(await page.locator('#ssi-brand').inputValue(),'all');assert.equal(await page.locator('[data-ssi-category-label]').textContent(),'请选择');assert.equal((await audit()).rows.length,initial.length);
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});await page.locator('[data-ssi-tier="secondary"]').click();assert(await page.locator('#ssi-material-field').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('[data-ssi-tier="primary"]').click();await page.locator('[data-ssi-category-trigger]').click();const panel=page.locator('#ssi-category-panel'),box=await panel.boundingBox();assert.equal(await panel.locator('section').count(),3);assert(box.x>=0&&box.x+box.width<=width+1,'级联面板不超屏');await page.keyboard.press('Escape');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：两类关系对应字段命名、复选框三级级联/父子联动/半选/跨分支多选、二级仅准入与可合作品牌匹配、品牌与准入物料完整候选、物料多选/字段隔离/交集筛选、Tab保留、重置、取消及宽窄屏。');
}
