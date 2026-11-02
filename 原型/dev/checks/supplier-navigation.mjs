import assert from 'node:assert/strict';
export async function verifySupplierJump(page,button,expectedPath){
 const destination=JSON.parse(await button.getAttribute('data-scp-jump'));
 assert.equal(destination.path,expectedPath);
 const depth=await page.locator('#dialog').getAttribute('data-drawer-depth'),open=await page.locator('#overlay').isVisible();
 await button.click();const notice=page.locator('#toast');await notice.waitFor({state:'visible'});assert(await page.locator('#metric-tooltip').isHidden(),'跳转说明不使用悬浮层');
 const text=await notice.innerText();assert(text.includes('跳转'+expectedPath));assert(!text.includes('\\n'),'toast保留真实换行');
 for(const [key,value] of destination.filters){const displayed=value.replace(/\b20(\d{2})-(\d{2})-(\d{2})\b/g,'$1/$2/$3');assert(text.includes(key+'：'+displayed),JSON.stringify({key,value,text}));}
 if(destination.note){assert(text.includes(destination.note));await notice.screenshot({path:'outputs/ui-refinements-20261022/supplier-material-jump-toast.png'})}
 assert.equal(await page.locator('#overlay').isVisible(),open,'点击数字不打开新抽屉');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),depth);
 assert.equal(await page.locator('[data-scp-drawer="members"]').count(),0);
 return destination;
}
export async function verifySupplierNavigation(page,root,audit){
 const pool='供应商管理-供应商资源池-全部',project='供应商管理-引入全流程管理-项目详情页',initial=await audit();
 const coreMaterials=await page.evaluate(()=>[...FilterCatalog.supplierCoreMaterials]);
 assert.deepEqual(coreMaterials,['电机','电池','电源线','线路板','塑料件','包装']);
 assert.equal(await page.locator('[data-scp-members]').count(),0,'供应商列表入口已移除');
 assert.equal(await root.locator('.scp-annual button.scp-count').count(),0,'年度总览六个数量均静态展示');
 for(const node of await root.locator('.scp-annual .scp-count').all()){assert.equal(await node.evaluate(e=>e.tagName),'SPAN');await node.click();assert(await page.locator('#overlay').isHidden());assert(await page.locator('#metric-tooltip').isHidden())}
 const first=root.locator('.scp-project-table [data-scp-jump]').first();await first.hover();assert(await page.locator('#metric-tooltip').isHidden(),'跳转提示只在点击后显示');
 const target=await verifySupplierJump(page,first,project);assert(initial.projects.some(p=>p.name===target.filters[0][1]));
 for(const row of await root.locator('.scp-category-table [data-scp-leaf]').all()){
  const id=await row.getAttribute('data-scp-leaf'),category=initial.categories.find(c=>c.id===id);
  for(const [index,status] of [[1,'意向储备'],[2,'准入储备']]){const button=row.locator('td').nth(index).locator('[data-scp-jump]'),d=JSON.parse(await button.getAttribute('data-scp-jump'));assert.deepEqual(d.filters,[['三级类目',category.path],['供应商状态',status]])}
  assert.equal(await row.locator('td').nth(3).locator('button').count(),0,'新增准入不提供跳转');
 }
 await verifySupplierJump(page,root.locator('.scp-category-table [data-scp-jump]').first(),pool);
 const table=root.locator('.scp-material-merged-table');
 assert.equal(await table.locator('[data-scp-brand],[data-scp-expand-brands],.scp-material-total-row').count(),0);
 const range=(await page.evaluate(()=>supplierPlanningAudit())).coverage[0].range;
 for(const row of await table.locator('.scp-material-row').all()){
  const brand=await row.getAttribute('data-scp-brand-row'),id=await row.getAttribute('data-scp-category-row'),category=initial.categories.find(c=>c.id===id);
  for(const [i,material]of coreMaterials.entries()){
   const cell=row.locator('td').nth(i+3),button=cell.locator('[data-scp-jump]');if(!await button.count()){assert.equal(await cell.innerText(),'无目标');continue}
   const destination=JSON.parse(await button.getAttribute('data-scp-jump'));assert.deepEqual(destination.filters,[['聚量合作品牌',brand],['三级类目',category.path],['供应商状态','全部'],['供应商类型','二级供应商'],['物料分类',material],['准入日期',range.start+' — '+range.cutoff]]);
  }
 }
 const materialFirst=table.locator('[data-scp-jump]').first();if(await materialFirst.count())await verifySupplierJump(page,materialFirst,pool);
 await page.evaluate(()=>{const old=document.createElement('button');old.dataset.scpMembers=JSON.stringify({scope:{kind:'resource'},metric:'reserved'});document.body.append(old);old.click();old.remove()});assert(await page.locator('#overlay').isHidden(),'旧数量事件也不会打开列表');
 console.log('通过：总览静态、项目/类目/物料点击toast、全部行筛选条件、聚量合作品牌新增说明及新增数量无跳转');
}
