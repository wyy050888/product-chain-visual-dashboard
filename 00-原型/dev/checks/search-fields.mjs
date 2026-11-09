import assert from 'node:assert/strict';
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function audit(page,root,label){
 await settle(page);
 const rows=await root.locator('input[type=search]').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(input=>{
  input.focus();const style=getComputedStyle(input),field=input.parentElement,outer=getComputedStyle(field),rect=field.getBoundingClientRect();let nested=0;
  for(let parent=field;parent&&parent!==document.body;parent=parent.parentElement){const css=getComputedStyle(parent),box=parent.getBoundingClientRect();if(parseFloat(css.borderTopWidth)>0&&parseFloat(css.borderRightWidth)>0&&parseFloat(css.borderBottomWidth)>0&&parseFloat(css.borderLeftWidth)>0&&box.height<=rect.height+8&&box.width<=rect.width+40)nested++}
  return{name:input.getAttribute('aria-label')||input.id,component:field.matches('.ui-search-field.unified-input-group')&&input.classList.contains('ui-search-input'),border:style.borderTopWidth,outline:style.outlineStyle,shadow:style.boxShadow,background:style.backgroundImage,outer:outer.borderTopWidth,nested,height:rect.height,width:rect.width};
 }));
 assert(rows.length,label+'应有搜索输入');
 for(const row of rows){assert(row.component,label+' '+row.name+'使用公共组件');assert.equal(row.border,'0px',JSON.stringify(row));assert.equal(row.outline,'none',JSON.stringify(row));assert.equal(row.shadow,'none',JSON.stringify(row));assert.equal(row.background,'none',JSON.stringify(row));assert.equal(row.outer,'1px',JSON.stringify(row));assert.equal(row.nested,1,JSON.stringify(row));assert(row.height>=34&&row.height<=40,JSON.stringify(row))}
 return rows.length;
}
export async function searchFields(page){
 let total=await audit(page,page.locator('body'),'首页');
 // 延迟创建和重复挂载保持同一输入节点及其业务事件。
 await page.evaluate(()=>{const host=document.createElement('aside'),input=document.createElement('input');host.id='search-contract-fixture';input.type='search';input.placeholder='动态搜索';input.style.cssText='border:2px solid red;outline:2px solid red;box-shadow:0 0 0 2px red';host.original=input;host.events=0;input.addEventListener('input',()=>host.events++);host.append(input);document.body.append(host)});
 total+=await audit(page,page.locator('#search-contract-fixture'),'动态挂载');
 await page.locator('#search-contract-fixture input').fill('测试');assert.equal(await page.locator('#search-contract-fixture').evaluate(n=>n.events),1);
 await page.locator('#search-contract-fixture').evaluate(n=>document.body.append(n));await settle(page);assert(await page.locator('#search-contract-fixture').evaluate(n=>n.querySelector('input')===n.original&&n.querySelectorAll('.ui-search-field').length===1));await page.locator('#search-contract-fixture').evaluate(n=>n.remove());
 const kinds=await page.locator('#riskrail [data-risk]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.risk))]);
 for(const kind of kinds){await page.locator('#riskrail [data-risk="'+kind+'"]').first().click();total+=await audit(page,page.locator('#dialogbody'),'风险榜 '+kind);await page.locator('#dialogbody input[type=search]').first().fill('不存在的搜索产品');await page.locator('#dialogbody input[type=search]').first().fill('');await page.locator('#close').click()}
 await page.locator('#riskrail [data-qr-detail]').first().click();assert.equal(await page.locator('[data-drawer-tab="handling"]').count(),0);
 await page.locator('[data-drawer-tab="quality"]').click();total+=await audit(page,page.locator('#dialogbody'),'产品违规列表');await page.locator('[data-up-violation-search]').fill('不存在的违规编号');assert.equal(await page.locator('#up-violation-table tbody tr').count(),0);await page.locator('#close').click();
 await page.locator('#pp-ai .pp-root-item').first().click();total+=await audit(page,page.locator('#pp-ai'),'项目风险台账');await page.locator('#pp-analysis-filters input[type=search]').fill('不存在的风险记录');assert.equal(await page.locator('#pp-analysis-ledger-results tbody tr[data-risk-id]').count(),0);await page.locator('[data-pp-analysis-reset]').click();assert.equal(await page.locator('#pp-analysis-filters input[type=search]').inputValue(),'');assert(await page.locator('#overlay').isHidden());
 await page.locator('[data-scp-all-categories]').click();total+=await audit(page,page.locator('#dialogbody'),'三级类目列表');await page.locator('#close').click();
 for(const [route,id] of [['#system-cost-efficiency','#cec-page'],['#system-core-links','#klc-page']]){await page.evaluate(hash=>location.hash=hash,route);await page.locator(id).waitFor({state:'visible'});total+=await audit(page,page.locator(id),'后台 '+route)}
 await page.evaluate(()=>location.hash='');await page.locator('#ai').waitFor({state:'visible'});await page.setViewportSize({width:390,height:900});total+=await audit(page,page.locator('body'),'窄屏首页');
 const overflow=await page.locator('.ui-search-field.unified-input-group').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).filter(n=>{const bar=n.closest('.ui-business-filters,.kpm-tools,.pp-filter-row');return bar&&n.getBoundingClientRect().width>bar.getBoundingClientRect().width+1}).map(n=>n.className));assert.deepEqual(overflow,[]);
 await page.setViewportSize({width:1920,height:1080});console.log('通过：'+total+' 个实际搜索框状态，公共组件单层边框、动态幂等挂载、原事件、查询/重置和窄屏');
}
