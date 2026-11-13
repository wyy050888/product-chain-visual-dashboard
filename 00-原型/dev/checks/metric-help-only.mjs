import assert from 'node:assert/strict';

export async function verifyMetricHelpOnly(page){
 const tip=page.locator('#metric-tooltip');
 await page.keyboard.press('Escape');
 const fields=page.locator('#riskrail .rp-quality-metric strong,#riskrail .rp-shop-metric strong,#riskrail [data-rp-field]>strong');
 assert(await fields.count()>0);
 assert.equal(await fields.locator('[title]').count(),0);
 assert((await fields.evaluateAll(es=>es.map(e=>e.getAttribute('title')))).every(value=>value===null),'风险指标没有原生title说明');
 await fields.first().hover();assert(await tip.isHidden());
 await page.locator('a[href="#inventory"]').click();
 const audit=await page.evaluate(()=>inventoryControlAudit());
 for(const selector of ['.ip-refurb-rate',':is([data-stock-stale-season],[data-stock-stale-season-value])','.ip-stock-share']){
  const node=page.locator('#inventory '+selector).first();
  assert.equal(await node.getAttribute('title'),null);
  assert.equal(await node.getAttribute('data-metric-rule'),null);
  await node.hover();assert(await tip.isHidden(),selector+'不弹指标说明');
 }
 const reveal=async help=>{
  await page.mouse.move(0,0);
  await help.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await help.hover();
  await tip.waitFor({state:'visible'});
 };
 await reveal(page.locator('#inventory [data-stock-rule="warehouse"]'));
 const stockTooltipClass=await tip.getAttribute('class');
 await page.keyboard.press('Escape');
 for(const [key,text] of [
  ['delivery','新机交付及时率 =（考核期内的已交付量+当前最新库存数（人工导入））/ 考核期内的采购总量'],
  ['refurb','翻新闭环率 = 到工厂之后30天完成翻新的采购单量 / 总采购单量'],
  ['stockout','非C级品、非清仓品、非下市品，近15天日均净销＞0 且 我司可售库存为0的次数']
 ]){
  const help=page.locator('#inventory [data-ip-overview-help="'+key+'"]');
  await reveal(help);
  assert.equal(await tip.getAttribute('class'),stockTooltipClass);
  assert.equal(await tip.innerText(),text);
  if(key==='delivery')assert.equal(await tip.locator('strong').innerText(),'（人工导入）');
  await page.keyboard.press('Escape');await help.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 }
 // 旧指标即使遗留data-metric-rule，也不能绕过问号限制触发公共浮层。
 await page.evaluate(()=>{
  const legacy=document.createElement('span');legacy.id='metric-legacy-check';legacy.className='ip-refurb-rate';legacy.tabIndex=0;legacy.dataset.metricRule='不应显示的旧指标说明';legacy.dataset.ipRefurbDistribution='{}';legacy.textContent='50%';document.body.append(legacy);
  legacy.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));legacy.focus();legacy.click();
 });
 assert(await tip.isHidden());await page.locator('#metric-legacy-check').evaluate(e=>e.remove());
 assert.deepEqual(await page.evaluate(()=>inventoryControlAudit().stockTotal),audit.stockTotal,'去掉提示不改变指标数据');
 await page.locator('a[href="#risk"]').click();
 console.log('通过：风险/库存指标无原生提示、分布不弹层、旧触发入口失效，问号鼠标/键盘仍可用，数据不变');
}
