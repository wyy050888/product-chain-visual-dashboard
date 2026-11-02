import assert from 'node:assert/strict';
// 从每一张图的Tab发起切换，验证两处状态、分组和原有筛选同时保持正确。
export async function verifyProjectChartDimensions(page){
 await verifyProjectScopePreservesDimension(page);
 const tabs=['data-pp-distribution','data-pp-dept-dimension'];
 const initial=await page.evaluate(()=>projectPanoramaAudit());
 await page.locator('[data-pp-risk-department="产品中心"]').click();
 const before=await page.evaluate(()=>({main:projectPanoramaAudit()}));
 await page.locator('#pp-filters').evaluate(el=>el.dimensionProbe=true);
 await page.locator('#pp-table-scroll').evaluate(el=>el.scrollTop=80);
 for(const attribute of tabs)for(const dimension of ['category','type']){
  await page.locator(`[${attribute}="${dimension}"]`).click();
  for(const key of tabs){
   assert.equal(await page.locator(`[${key}][aria-pressed="true"]`).count(),1);
   assert.equal(await page.locator(`[${key}="${dimension}"]`).getAttribute('aria-pressed'),'true','两图Tab同步 '+attribute+' → '+key);
  }
  assert(await page.locator(`[${attribute}="${dimension}"]`).evaluate(el=>el===document.activeElement),'重绘后保留原Tab键盘焦点');
  const current=await page.evaluate(()=>({main:projectPanoramaAudit()}));
  assert.equal(current.main.state.distribution,dimension);
  const labels=await page.locator('.pp-distribution .pp-bar-label').allTextContents();
  assert.deepEqual([...labels].sort(),[...new Set(before.main.scope.map(row=>row[dimension]))].sort(),'图表显示当前维度分组');
  assert.deepEqual(await page.locator('.pp-distribution .pp-bar-label').allTextContents(),labels);
  assert.deepEqual(await page.locator('.pp-departments .pp-bar-label').allTextContents(),labels);
  assert.equal(current.main.state.riskDepartment,'产品中心','保留责任部门');
  const stateWithoutDimension=state=>Object.fromEntries(Object.entries(state).filter(([key])=>key!=='distribution'));
  assert.deepEqual(stateWithoutDimension(current.main.state),stateWithoutDimension(before.main.state),'切换分组不改写筛选及分页');
  assert.deepEqual(current.main.filtered.map(row=>row.id),before.main.filtered.map(row=>row.id),'明细范围不变');
  assert(await page.locator('#pp-filters').evaluate(el=>el.dimensionProbe),'不重建明细筛选控件');
  assert.equal(await page.locator('#pp-table-scroll').evaluate(el=>el.scrollTop),80,'不重置明细滚动位置');
 }
 await page.locator('[data-pp-risk-department="'+initial.state.riskDepartment+'"]').click();
 if(initial.state.distribution!=='type')await page.locator('[data-pp-distribution="'+initial.state.distribution+'"]').click();
 await page.locator('#pp-table-scroll').evaluate(el=>el.scrollTop=0);
}

export async function verifyProjectScopePreservesDimension(page){
 const snapshot=()=>page.evaluate(()=>projectPanoramaAudit()),initial=await snapshot();
 const filter=(key,value)=>page.locator(`[data-pp-${key}-tab="${value}"]`);
 async function verify(dimension){
  const data=await snapshot();assert.equal(data.state.distribution,dimension,'范围筛选保留分组维度');
  for(const attr of ['data-pp-distribution','data-pp-dept-dimension'])assert.equal(await page.locator(`[${attr}="${dimension}"]`).getAttribute('aria-pressed'),'true','两图保留原Tab');
  assert.equal(data.state.riskDepartment,initial.state.riskDepartment);
  assert.equal(data.state.page,1);
  assert(data.scope.every(row=>['type','category'].every(key=>!data.state[key].length||data.state[key].includes(row[key]))),'筛选仍更新图表与明细数据范围');
 }
 for(const dimension of ['type','category']){
  await filter('type','all').click();await filter('category','all').click();
  await page.locator(`[data-pp-distribution="${dimension}"]`).click();
  for(const key of ['type','category']){
   const options=await page.locator(`[data-pp-${key}-tab]`).evaluateAll((nodes,key)=>nodes.map(node=>node.getAttribute('data-pp-'+key+'-tab')).filter(value=>value!=='all'),key);
   for(const value of [options[0],options[1],options[0],'all']){await filter(key,value).click();await verify(dimension)}
   await filter(key,options[0]).focus();await page.keyboard.press('Enter');await verify(dimension);await filter(key,'all').click();
  }
 }
 for(const key of ['type','category']){await filter(key,'all').click();for(const value of initial.state[key])await filter(key,value).click()}
 await page.locator(`[data-pp-distribution="${initial.state.distribution}"]`).click();
 console.log('通过：顶部类型/类目多选、取消、全部及键盘筛选均不切换图表Tab');
}
