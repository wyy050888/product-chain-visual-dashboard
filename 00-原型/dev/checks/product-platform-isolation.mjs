import assert from 'node:assert/strict';
export async function verifyProductPlatformIsolation(page){
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]'),control=kind=>board(kind).locator('[data-rp-card-platform]');
 const selected=kind=>control(kind).evaluate(e=>[...e.selectedOptions].map(o=>o.value)),choose=(kind,value)=>control(kind).selectOption(value,{force:true});
 const initial={0:await selected(0),6:await selected(6)},other=await board(6).elementHandle(),returnText=await board(6).innerText();
 await choose(0,'快手');assert.deepEqual(await selected(6),initial[6]);assert.equal(await board(6).innerText(),returnText);assert(await board(6).evaluate((node,original)=>node===original,other),'只重绘本榜，另一榜DOM保持');
 const quality=await board(0).elementHandle(),qualityText=await board(0).innerText();
 await choose(6,['京东','拼多多']);assert.deepEqual(await selected(0),['快手']);assert.equal(await board(0).innerText(),qualityText);assert(await board(0).evaluate((node,original)=>node===original,quality));
 await choose(0,'all');assert.deepEqual(await selected(6),['京东','拼多多']);await choose(0,[]);assert.deepEqual(await selected(0),['all'],'清空仅恢复当前榜全平台');
 await choose(0,'快手');
 for(const kind of [0,6])for(const card of await board(kind).locator('.rp-platform-product').all())assert.deepEqual(await card.locator('[data-rp-platform-row]').evaluateAll(es=>es.map(e=>e.dataset.rpPlatformRow)),await selected(kind),'平台行随各自筛选展示');
 await board(0).locator('[data-risk]').click();
 const values=selector=>page.locator(selector).evaluate(e=>[...e.selectedOptions].map(o=>o.value));
 const tabs=id=>page.locator('[data-drawer-platform-for="'+id+'"]'),tab=(id,value)=>tabs(id).locator('[data-platform-value="'+value+'"]');
 const checkTabs=async id=>{
  assert.equal(await tabs(id).locator('button').count(),7);assert.equal(await tabs(id).locator('img').count(),6);
  assert.deepEqual(await tabs(id).locator('button').allTextContents(),['全平台','抖音','快手','视频号','天猫','京东','拼多多']);
  assert(await page.locator('#'+id).evaluate(e=>e.hidden&&!e.closest('.pf-multi')),'平台为平铺Tab，无下拉');
  const active=await tabs(id).locator('[aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.platformValue));assert.deepEqual(active,await values('#'+id));
  if(id==='qr-list-platform'){
   const candidates=await page.evaluate(()=>qualityViolationRankingSnapshot().candidates),selected=await values('#'+id);
   const dropHeader=page.locator('#qr-list-table [data-rp-sort="drop"]');
   assert.equal(await dropHeader.count(),selected.length>1||selected.includes('all')||selected.includes('拼多多')?1:0,'多平台对照保留链接掉权列');
   const dropIndex=await dropHeader.count()?await dropHeader.evaluate(e=>e.closest('th').cellIndex):-1;
   for(const row of await page.locator('#qr-list-table tbody tr').all()){
    const detail=row.locator('[data-qr-detail]');if(!await detail.count())continue;
    const key=await detail.getAttribute('data-qr-detail'),candidate=candidates.find(r=>r.key===key);
    assert(candidate&&candidate.facts.totalCount>0);assert(selected.includes('all')||selected.includes(candidate.platform));const actual=[candidate.platform];
    assert(actual.length>0);assert.deepEqual(await row.locator('.rp-identity .rp-platform-mark').evaluateAll(es=>es.map(e=>e.alt)),actual,'每行只显示当前产品的单个平台Logo');
    assert.equal(await row.locator('.rp-platform-name').evaluate(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('')),'');
    if(dropIndex>=0&&candidate.platform!=='拼多多')assert.equal((await row.locator('td').nth(dropIndex).innerText()).trim(),'--','不适用的平台不补造掉权次数');
   }
  }
 };
 assert.deepEqual(await values('#qr-list-platform'),['快手']);await checkTabs('qr-list-platform');
 await tab('qr-list-platform','抖音').click();assert.deepEqual(await values('#qr-list-platform'),['抖音','快手']);await checkTabs('qr-list-platform');
 await tab('qr-list-platform','快手').click();assert.deepEqual(await values('#qr-list-platform'),['抖音']);await checkTabs('qr-list-platform');await tab('qr-list-platform','all').click();await checkTabs('qr-list-platform');await tab('qr-list-platform','抖音').click();
 await page.locator('[data-drawer-tab="ranking-6"]').click();assert.deepEqual(await values('#rf-return-platform'),['京东','拼多多'],'切入另一个榜继承它自己的平台');
 await checkTabs('rf-return-platform');await tab('rf-return-platform','all').click();assert.deepEqual(await values('#rf-return-platform'),['all']);await tab('rf-return-platform','视频号').click();assert.deepEqual(await values('#rf-return-platform'),['视频号']);await tab('rf-return-platform','视频号').click();assert.deepEqual(await values('#rf-return-platform'),['all'],'取消最后一项恢复全平台');await tab('rf-return-platform','视频号').click();await page.locator('[data-rp-reset]').click();assert.deepEqual(await values('#rf-return-platform'),['抖音','天猫']);
 await page.locator('[data-drawer-tab="ranking-0"]').click();assert.deepEqual(await values('#qr-list-platform'),['抖音'],'抽屉内按榜保留筛选');await checkTabs('qr-list-platform');
 for(const width of [1920,390,320]){
  await page.setViewportSize({width,height:1080});assert(await tabs('qr-list-platform').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Tab窄屏折行无横向溢出');
  await tab('qr-list-platform','all').focus();await page.keyboard.press('End');assert(await tab('qr-list-platform','拼多多').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Home');assert(await tab('qr-list-platform','all').evaluate(e=>e===document.activeElement));
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 assert.deepEqual(await selected(0),['快手']);assert.deepEqual(await selected(6),['京东','拼多多'],'抽屉重置和筛选不回写首页');
 await choose(6,'all');assert.deepEqual(await selected(0),['快手']);await choose(0,initial[0]);await choose(6,initial[6]);
 console.log('通过：产品违规/退货平台双向隔离、多选/全平台/清空、另一榜不重绘、各自榜单继承与Tab筛选隔离。');
}
