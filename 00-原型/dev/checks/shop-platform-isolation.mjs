import assert from 'node:assert/strict';

export async function verifyShopPlatformIsolation(page){
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'],shop=page.locator('#riskrail [data-rp-board="1"]');
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]'),control=kind=>board(kind).locator('[data-rp-card-platform]');
 const selected=kind=>control(kind).evaluate(node=>[...node.selectedOptions].map(option=>option.value));
 const choose=async(kind,value)=>{await control(kind).selectOption(value,{force:true})};
 const initial=await selected(0),initialReturn=await selected(6);assert.deepEqual(await selected(1),['抖音']);
 assert.equal(await control(1).evaluate(node=>node.multiple),false);assert.deepEqual(await control(1).locator('option').allTextContents(),platforms);
 assert.equal(await shop.locator('[data-rp-platform-option="all"]').count(),0);assert.equal(await shop.locator('.rp-platform-tags').getAttribute('role'),'radiogroup');
 const before=await shop.innerText();await choose(0,'快手');assert.equal(await shop.innerText(),before,'切换上方两榜不刷新店铺');
 assert.deepEqual(await selected(6),initialReturn);
 for(const platform of platforms){
  await shop.locator('[data-rp-platform-option="'+platform+'"]').click();assert.deepEqual(await selected(1),[platform]);assert.deepEqual(await selected(0),['快手']);assert.deepEqual(await selected(6),initialReturn);
  assert(await shop.locator('.rp-shop-identity .rp-platform-mark').evaluateAll((nodes,name)=>nodes.every(node=>node.alt===name),platform),'店铺记录只属于当前平台');
  const count=Number(await shop.locator('[data-rp-platform-option="'+platform+'"] .rp-platform-count').innerText());assert.equal(Number((await shop.locator('[data-risk="1"]').innerText()).match(/\d+/)[0]),count);
 }
 await choose(0,['抖音','天猫']);assert.deepEqual(await selected(1),['拼多多'],'店铺选择不受上方重选影响');
 const entry=shop.locator('.rp-shop-entry').first(),id=Number((await entry.getAttribute('data-rp-row')).split(':')[1]),links=await page.evaluate(id=>pddShopLinksSnapshot(id).all,id);
 for(const [tone,count,background,color]of [['red',links.filter(row=>row.redCount>=3).length,'rgb(255, 242, 243)','rgb(210, 68, 91)'],['yellow',links.filter(row=>row.redCount>0&&row.redCount<3).length,'rgb(255, 249, 233)','rgb(217, 152, 18)']]){
  const tag=entry.locator('.rp-pdd-count--'+tone);assert.equal(Number(await tag.locator('strong').innerText()),count,'标签沿用原链接数');
  assert.deepEqual(await tag.evaluate(node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color})),{background,color},'恢复历史浅色标签');
 }
 for(const width of [1920,1024,390,320]){await page.setViewportSize({width,height:1080});assert(await shop.evaluate(node=>node.scrollWidth<=node.clientWidth+1));assert(await shop.locator('.rp-pdd-count--card').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)))}
 await page.setViewportSize({width:1920,height:1080});await shop.locator('[data-risk="1"]').click();
 const drawer=page.locator('#rf-list-platform');assert.equal(await drawer.inputValue(),'拼多多');assert.deepEqual(await drawer.locator('option').allTextContents(),platforms);assert.equal(await drawer.evaluate(node=>node.multiple),false);
 await drawer.selectOption('快手',{force:true});assert.deepEqual(await selected(1),['拼多多'],'完整榜单不回写店铺卡片');
 await page.locator('[data-rp-reset]').click();assert.equal(await drawer.inputValue(),'抖音');assert.deepEqual(await selected(1),['拼多多']);await page.locator('#close').click();
 await shop.locator('[data-rp-platform-option="天猫"]').focus();await page.keyboard.press('Home');assert.deepEqual(await selected(1),['抖音'],'店铺单选支持键盘');
 await choose(0,initial);console.log('通过：店铺独立六平台单选/默认抖音/无全平台、与产品双向隔离、完整榜单继承重置、拼多多旧标签/原数量/窄屏');
}
