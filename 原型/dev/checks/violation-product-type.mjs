import assert from 'node:assert/strict';

export async function violationProductType(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const card=page.locator('#riskrail [data-rp-board="0"]'),returns=page.locator('#riskrail [data-rp-board="6"]');
 const choice=value=>card.locator('[data-rp-product-type="'+value+'"]'),ids=()=>card.locator('.rp-platform-product').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSpu));
 assert.deepEqual(await card.locator('[data-rp-product-type]').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['全部','新品','老品']);
 assert.equal(await choice('all').getAttribute('aria-checked'),'true');
 await card.locator('[data-rp-platform-option="all"]').click();
 const baseline=await page.evaluate(()=>({records:qualityViolationRankingSnapshot().records,spus:referenceSampleAudit().spus})),products=new Map(baseline.spus.map(row=>[row.spuId,row]));
 const expected=(type,platform='all')=>baseline.records.filter(row=>(platform==='all'||row.violatedPlatforms.includes(platform))&&(type==='all'||products.get(row.spuId)?.cohort===type));
 const otherNode=await returns.elementHandle(),otherText=await returns.locator('.rhead').innerText();
 for(const type of ['new','old','all']){
  await choice(type).click();assert.deepEqual(await ids(),expected(type).slice(0,6).map(row=>row.spuId),'全量先筛选后取TOP6');
  assert.equal(await choice(type).getAttribute('aria-checked'),'true');
  assert.equal(Number(await choice(type).locator('b').innerText()),expected(type).length);
  for(const value of ['all','new','old'])assert.equal(Number(await choice(value).locator('b').innerText()),expected(value).length,'计数忽略新老品自身选择');
 }
 assert(expected('new').length>0&&expected('old').length>0);
 assert(await otherNode.evaluate(node=>node.isConnected),'不重绘退货榜');assert.equal(await returns.locator('.rhead').innerText(),otherText);
 await choice('new').click();const selected=await ids();await choice('new').click();assert.deepEqual(await ids(),selected,'重复点击不清空');
 await card.locator('[data-rp-platform-option="抖音"]').click();assert.deepEqual(await ids(),expected('new','抖音').slice(0,6).map(row=>row.spuId));
 assert.equal(Number(await card.locator('[data-rp-platform-option="all"] b').innerText()),expected('new').length,'平台计数同步新老品');
 await card.locator('[data-risk="0"]').click();const typeSelect=page.locator('#dialogbody [data-rp-filter="productType"]');
 assert.deepEqual(await typeSelect.evaluate(node=>[...node.selectedOptions].map(option=>option.value)),['new'],'完整榜单继承新品选择');
 await typeSelect.selectOption('old',{force:true});await page.locator('#close').click();assert.equal(await choice('new').getAttribute('aria-checked'),'true','抽屉不回写外侧');
 await choice('new').focus();await page.keyboard.press('ArrowRight');assert.equal(await choice('old').getAttribute('aria-checked'),'true');
 await card.locator('[data-rp-season-option="冬季品"]').click();assert.equal(await choice('old').getAttribute('aria-checked'),'true','保留新老品与季品组合');
 assert.equal(Number(await choice('old').locator('b').innerText()),Number((await card.locator('[data-risk="0"]').innerText()).match(/\d+/)[0]));
 for(const width of [1920,1100,390,320]){await page.setViewportSize({width,height:1080});assert(await card.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'筛选区无溢出 '+width);assert(await choice('new').isVisible())}
 await otherNode.dispose();console.log('通过：违规榜新老品单选、原主数据计数、TOP6、平台/季品组合、抽屉继承与隔离、键盘和宽窄屏。');
}
