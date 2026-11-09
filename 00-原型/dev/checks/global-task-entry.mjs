import {closeTaskEntry} from './global-task-close.mjs';
import assert from 'node:assert/strict';
// 对象下拉与表单字段联动；本检查取消录入，不改变任务清单数量。
export async function verifyTaskObjectPicker(page){
 const root=page.locator('#ai'),dialog=()=>page.locator('.gd-task-entry-dialog');
 await root.locator('[data-gd-task-create]').click();let d=dialog();
 const type=d.locator('[name=objectType]'),query=d.locator('[name=objectReference]'),list=d.locator('#gd-task-object-options');
 const verifyToggle=async()=>{
  const before=await query.evaluate(node=>({value:node.value,id:node.dataset.objectId,category:node.form.elements.category.value}));
  if(!(await list.isVisible()))await query.click();assert(await list.isVisible(),'首次点击展开');
  await query.click();assert(await list.isHidden(),'再次点击输入框收起');assert.equal(await query.getAttribute('aria-expanded'),'false');
  const box=await query.boundingBox(),arrow={x:box.width-14,y:box.height/2};
  await query.click({position:arrow});assert(await list.isVisible(),'右侧箭头点击展开');await query.click({position:arrow});assert(await list.isHidden(),'右侧箭头再次点击收起');
  assert.deepEqual(await query.evaluate(node=>({value:node.value,id:node.dataset.objectId,category:node.form.elements.category.value})),before,'收起不改已选身份、输入内容和链群');
  await d.locator('[name=title]').focus();await query.focus();assert(await list.isHidden(),'聚焦不与点击开合冲突');await query.press('ArrowDown');assert(await list.isVisible(),'键盘仍可展开');await query.press('Escape');assert(await list.isHidden());
 };
 assert.equal(await d.locator('datalist').count(),0);assert.equal(await query.getAttribute('role'),'combobox');assert.equal(await d.locator('.gd-task-entry-note').count(),0,'删除新增弹窗底部说明');
 await type.selectOption('product');assert.equal(await query.getAttribute('placeholder'),'请输入产品名称/SPU码/型号');await query.click();assert(await list.isVisible());
 const first=list.locator('[role=option]').first(),product={id:await first.getAttribute('data-gd-object-id'),code:await first.getAttribute('data-gd-object-code'),model:await first.getAttribute('data-gd-object-model'),name:await first.locator('b').innerText()};
 await query.fill(product.model||product.name.slice(0,2));assert(await list.locator('[data-gd-object-id="'+product.id+'"]').count(),'支持产品型号/名称模糊搜索');
 await list.locator('[data-gd-object-id="'+product.id+'"]').click();assert.equal(await query.inputValue(),product.name);assert.equal(await query.getAttribute('data-object-id'),product.id);assert.equal(await query.getAttribute('aria-expanded'),'false');
 await verifyToggle();
 await query.fill('不存在的对象xyz');assert.equal(await list.locator('[role=option]').count(),0);assert.match(await list.innerText(),/没有匹配/);assert.equal(await query.evaluate(node=>node.checkValidity()),false,'自由文本不能冒充已选对象');await query.press('Escape');assert(!(await list.isVisible()));assert(await d.isVisible(),'Escape只关闭候选列表');
 await type.selectOption('project');assert.equal(await query.getAttribute('placeholder'),'请输入项目名称');assert.equal(await query.inputValue(),'');await query.click();const project={id:await list.locator('[role=option]').first().getAttribute('data-gd-object-id')};const projectTypes=await page.evaluate(()=>Object.fromEntries(projectPanoramaAudit().scope.map(row=>[String(row.id),row.type])));
 const projectOptions=await list.locator('[role=option]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.gdObjectId,code:node.dataset.gdObjectCode,type:node.querySelector('small').textContent,direction:getComputedStyle(node).flexDirection,right:node.getBoundingClientRect().right-node.querySelector('small').getBoundingClientRect().right,overlap:node.querySelector('b').getBoundingClientRect().right-node.querySelector('small').getBoundingClientRect().left})));
 assert(projectOptions.length>0);for(const option of projectOptions){assert.equal(option.code,'','不把内部ID作为项目编码显示');assert.equal(option.direction,'row');assert(Math.abs(option.right-10)<=1&&option.overlap<=0,'项目类型右对齐且不挤压名称');if(projectTypes[option.id])assert.equal(option.type,projectTypes[option.id],'项目类型与项目全景一致')}
 await query.press('ArrowDown');assert(await query.getAttribute('aria-activedescendant'));await query.press('Enter');assert.equal(await query.getAttribute('data-object-id'),project.id,'键盘选择项目稳定ID');
 await verifyToggle();
 await type.selectOption('shop');assert.equal(await query.getAttribute('placeholder'),'请输入店铺名称/店铺ID');assert(await d.locator('[data-gd-task-chain]').isHidden());assert(await d.locator('[name=category]').isDisabled());assert.equal(await d.locator('[name=category]').inputValue(),'');await query.click();const shop={id:await list.locator('[role=option]').first().getAttribute('data-gd-object-id')};const expectedPlatforms=await page.evaluate(()=>Object.fromEntries(referenceSampleAudit().shops.filter(row=>row.channel).map(row=>[String(row.shopId||row.id),row.channel])));
 const shopOptions=await list.locator('[role=option]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.gdObjectId,logos:node.querySelectorAll('b .rp-platform-mark').length,platform:node.querySelector('b img')?.alt,idText:node.querySelector('small').textContent,gap:node.querySelector('b img')?.getBoundingClientRect().left-node.querySelector('b span').getBoundingClientRect().right})));
 for(const option of shopOptions){assert.equal(option.logos,1,'每店名称后一个平台Logo');assert(option.idText,'保留店铺ID');assert(Math.abs(option.gap-6)<1,'Logo紧随名称');if(expectedPlatforms[option.id])assert.equal(option.platform,expectedPlatforms[option.id])}
 await page.waitForFunction(()=>[...document.querySelectorAll('#gd-task-object-options img')].every(img=>img.complete&&img.naturalWidth>0));
 await query.fill(shop.id.toLowerCase());assert.equal(await list.locator('[role=option]').count(),1,'店铺ID可搜索');await list.locator('[role=option] .rp-platform-mark').click();assert.equal(await query.getAttribute('data-object-id'),shop.id);
 await verifyToggle();
 await type.selectOption('product');assert(await d.locator('[data-gd-task-chain]').isVisible());assert(await d.locator('[name=category]').isDisabled());assert.equal(await query.inputValue(),'');await query.fill(product.code.toLowerCase());await query.dispatchEvent('change');assert.equal(await query.getAttribute('data-object-id'),product.id,'精确编码兼容大小写并关联主数据');
 const chain=d.locator('[name=category]'),sources=await page.evaluate(()=>{const audit=referenceSampleAudit(),names=['清洁','厨电','环境','个护&健康'];return {product:audit.spus.map(row=>({id:String(row.spuId),category:names[row.chain]})),project:projectPanoramaAudit().scope.map(row=>({id:String(row.id),category:row.category}))}});
 for(const kind of ['product','project']){
  await type.selectOption(kind);assert.equal(await chain.inputValue(),'');assert(await chain.isDisabled());
  for(const category of ['环境','清洁','厨电','个护&健康']){
   const record=sources[kind].find(row=>row.category===category);assert(record,kind+'具有'+category+'主数据');
   await query.fill('');if(!(await list.isVisible()))await query.click();await list.locator('[data-gd-object-id="'+record.id+'"]').click();assert.equal(await chain.inputValue(),category,'链群随所选'+kind+'更新');
   assert.equal(await d.locator('form').evaluate(form=>new FormData(form).has('category')),false,'不可手动覆盖关联对象链群');
  }
  await query.fill('无匹配对象xyz');assert.equal(await chain.inputValue(),'','清空旧对象链群');
 }
 await type.selectOption('');assert(await chain.isEnabled());assert.equal(await chain.inputValue(),'');await chain.selectOption('环境');assert.equal(await chain.inputValue(),'环境','未关联任务仍可指定链群');
 await closeTaskEntry(page);
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});await root.locator('[data-gd-task-create]').click();d=dialog();await d.locator('[name=objectType]').selectOption('shop');await d.locator('[name=objectReference]').click();
  const rect=await d.locator('#gd-task-object-options').boundingBox();assert(rect&&rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=1080,'候选列表不超出视口 '+width);assert(await d.evaluate(node=>node.scrollWidth<=node.clientWidth+1));assert(await d.locator('[role=option]').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),'店铺名称/Logo不外溢 '+width);
  const input=d.locator('[name=objectReference]');await input.click();assert(await d.locator('#gd-task-object-options').isHidden(),'宽窄屏再次点击均可收起');await input.click();assert(await d.locator('#gd-task-object-options').isVisible());
  await d.locator('[name=objectType]').selectOption('project');await d.locator('[name=objectReference]').click();assert(await d.locator('[role=option]').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),'项目名称/类型不外溢 '+width);
  await closeTaskEntry(page);
 }
 await page.setViewportSize({width:1920,height:1080});return {product,project,shop};
}
