import assert from 'node:assert/strict';
import {verifyStockRankingModel,assertRankingOrder,agedTuple} from './stock-ranking-model.mjs';
import {fileURLToPath} from 'node:url';

export async function inventoryStagnantTop(page){
 verifyStockRankingModel();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('a[href="#inventory"]').click();
 const host=page.locator('#inventory-stagnant-top'),snapshot=()=>page.evaluate(()=>inventoryControlAudit().stagnantTop);
 async function verify(seasons=[]){
  const model=await snapshot();assert.equal(model.rows.length,Math.min(10,model.count));
  assert.equal(await host.locator('[data-ip-stagnant-all]').getAttribute('data-count'),String(model.count),'查看全部数量取当前季品完整入池集合');
  assert(model.rows.every(row=>row.staleUnits>0&&Number.isFinite(row.staleMaxAgeDays)&&row.staleMaxAgeDays>=60));
  if(seasons.length)assert(model.rows.every(row=>seasons.includes(row.attribute)));
  assertRankingOrder(model.rows,agedTuple);
  const codes=await host.locator('[data-sku-code]').evaluateAll(nodes=>nodes.map(node=>node.dataset.skuCode));
  assert.deepEqual([...codes].sort(),model.rows.map(row=>row.skuCode).sort());return model;
 }
 const initial=await verify();assert(initial.count>10,'真实样例覆盖Top10截取');
 await host.locator('[data-ip-stagnant-all]').click();await page.locator('#toast').waitFor({state:'visible'});assert.equal(await page.locator('#toast').innerText(),'跳转产品库存-滞销品');assert(await page.locator('#overlay').isHidden(),'查看全部只提示跳转');
 const titleHelp=host.locator('.ip-stagnant-heading .card-metric-help');assert.equal(await titleHelp.count(),1);assert.equal(await host.locator('.ip-stagnant-heading .note').count(),0);
 assert.equal(await host.locator('[data-ip-stagnant-detail]').count(),initial.rows.length,'每条记录提供查看入口');
 await host.locator('[data-ip-stagnant-detail]').first().click();
 await page.locator('#toast').waitFor({state:'visible'});
 assert.equal(await page.locator('#toast').innerText(),'跳转现有产品库存详情页');
 assert(await page.locator('#overlay').isHidden(),'查看仅提示跳转，不打开原型详情');
 const warningChannels=new Map(await page.evaluate(()=>stagnantRankingSnapshot().rows.map(row=>[row.skuCode,row.responsibleChannel??'—'])));
 const oneDecimal=new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1});
 const twoDecimals=new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false});
 async function verifyPresentation(){
  const model=await snapshot(),records=new Map(model.rows.map(row=>[row.skuCode,row]));
  for(const tr of await host.locator('tbody tr').all()){
   const code=await tr.locator('[data-sku-code]').getAttribute('data-sku-code'),record=records.get(code);
   const tone=Number.isFinite(record.sellableCoverage15)?'rp-quality-normal':'rp-quality-gray';
   for(const index of [2,3]){
    const cell=tr.locator('td').nth(index),nodes=cell.locator('strong,em');assert.equal(await nodes.count(),2);
    assert(await cell.locator('strong').evaluate(el=>el.classList.contains('rp-quality-normal')),'左侧数量与金额恢复普通数值色');
    assert(await cell.locator('em').evaluate(el=>el.classList.contains('rp-quality-gray')),'占比保持普通辅助色');
    assert.equal(await cell.locator('.rp-quality-red,.rp-quality-yellow').count(),0,'左侧不再展示预警色');
   }
   if(warningChannels.has(code)){
    assert.equal(await tr.locator('td').nth(5).locator('strong').innerText(),warningChannels.get(code));
   }
   const sellable=tr.locator('td').nth(6);
   assert.equal(await sellable.locator('strong').innerText(),record.sellableUnits.toLocaleString('zh-CN')+'件');
   const yuan=record.sellableValueCents/100,inWan=Math.abs(yuan)>10000;
   const worth=Number.isFinite(record.sellableValueCents)?twoDecimals.format(inWan?yuan/10000:yuan)+(inWan?'万元':'元'):'—';
   assert.equal(await sellable.locator('em').innerText(),'货值 '+worth);
   const days=tr.locator('td').nth(7).locator('strong');
   assert(await days.evaluate((el,tone)=>el.classList.contains(tone),tone),'已发生呆滞不按可售天数另判红黄');
   assert.equal(await days.innerText(),Number.isFinite(record.sellableCoverage15)?oneDecimal.format(record.sellableCoverage15)+'天':'—');
  }
  assert.equal(await page.locator('#inventorytable .rp-quality-red,#inventorytable .rp-quality-yellow').count(),0,'品牌类目不使用产品Top10判色');
  assert.equal((await host.locator('th').allTextContents()).at(-1),'操作');
  assert.equal(await host.locator('[data-ip-stagnant-detail]').count(),records.size);
  assert((await host.locator('[data-ip-stagnant-detail]').allTextContents()).every(text=>text==='查看'));
  const helpRules=await host.locator('th .metric-help').evaluateAll(nodes=>nodes.map(node=>node.dataset.metricRule));
  assert.deepEqual(helpRules.slice(0,3),['呆滞库存','呆滞货值','呆滞最高库龄']);
  assert.equal(helpRules.length,4);
  assert.equal(helpRules[3],'用我司可售库存判定责任渠道，当出现产品呆滞时，判断当前我司可售天数最高的虚拟仓');
  assert.equal(await host.locator('.rp-product-tag').count(),0,'Top10移除属性列及新老品标签');
 }
 await verifyPresentation();await titleHelp.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.mouse.move(0,0);await titleHelp.hover();await titleHelp.evaluate(node=>node.focus({preventScroll:true}));
 const tooltip=page.locator('#metric-tooltip');await tooltip.waitFor({state:'visible'});
 assert.deepEqual(await tooltip.locator('.metric-rule-section h4').allTextContents(),['入榜条件','排序规则'],'提示只保留入榜及排序');
 assert.doesNotMatch(await tooltip.textContent(),/按SKU统计|沿用库存模块|我司可售库存÷|仅我司可售天数判色|各自占比正常展示|按未取整天数判定|按当前季品范围排序后取前10条/,'仅保留入榜、红黄及排序条目');
 assert.match(await tooltip.textContent(),/存在库龄≥60天的库存/);assert.match(await tooltip.textContent(),/呆滞库存占比降序/);assert.doesNotMatch(await tooltip.textContent(),/45≤|红黄规则|我司可售库存＞0|净销量＞0|可售天数≥/);
 await tooltip.screenshot({path:fileURLToPath(new URL('../../outputs/inventory-stagnant-rule.png',import.meta.url))});
 await page.keyboard.press('Escape');
 const ownHeaders=await host.locator('th').allTextContents();
 await page.locator('#riskrail [data-risk="4"]').click();
 const referenceHeaders=await page.locator('#rf-list-table th').allTextContents();
 assert.deepEqual(ownHeaders,referenceHeaders.filter(name=>name!=='属性'),'Top10指标顺序与呆滞预警榜一致');
 await page.keyboard.press('Escape');
 const select=page.locator('#inventory .ip-season-filter select');
 for(const seasons of [['夏季品'],['冬季品'],['夏季品','四季品']]){await select.selectOption(seasons,{force:true});await verify(seasons);await verifyPresentation()}
 await select.selectOption('all',{force:true});await verify();
 await host.locator('[data-rp-sort="sellableCoverage15"]').click();
 const text=await host.locator('tbody tr td:nth-child(8) strong').allTextContents();
 const values=text.map(value=>{const number=parseFloat(value.replaceAll(',',''));return Number.isFinite(number)?number:-Infinity});
 assert(values.every((value,index)=>!index||values[index-1]>=value),'可售天数列排序');
 await verifyPresentation();
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});
  const rect=await host.evaluate(node=>{const r=node.getBoundingClientRect(),s=node.querySelector('.ip-stagnant-scroll');return{left:r.left,right:r.right,width:document.documentElement.clientWidth,overflow:s.scrollWidth>s.clientWidth}});
  assert(rect.left>=-1&&rect.right<=rect.width+1,'模块无外溢');if(width<=1024)assert(rect.overflow,'窄屏表内滚动');
 }
 await page.setViewportSize({width:1920,height:1080});await host.scrollIntoViewIfNeeded();
 await host.screenshot({path:fileURLToPath(new URL('../../outputs/inventory-stagnant-top.png',import.meta.url))});
 console.log('通过：Top10库龄≥60天独立入榜、金额/库龄/占比排序、季品筛选、查看跳转提示、精简提示及响应式布局');
}
