import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyInventoryRefurb(page){
 const context=businessRuleContext({fmt:String,upMoney:String,aiFlowDayDiff:(start,end)=>(Date.parse(end)-Date.parse(start))/86400000});
 vm.runInContext(readFileSync(new URL('../../src/modules/inventory-period/02-refurb.js',import.meta.url),'utf8'),context);
 vm.runInContext(readFileSync(new URL('../../src/modules/ui-controls/00-stock-quantity.js',import.meta.url),'utf8'),context);
 vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/06-stock-model.js',import.meta.url),'utf8'),context);
 const end='2026-10-20',start='2026-07-01',arrivedAt='2026-07-03';
 const day=n=>new Date(Date.parse(start)+n*86400000).toISOString().slice(0,10);
 const rows=[32,33,34,44,45,59,60,72].map((days,i)=>({spuId:'same-spu',skuId:'SKU-A',requisitionId:'R'+i,orderedAt:start,arrivedAt,completedAt:day(days)}));
 const pending={spuId:'same-spu',skuId:'SKU-A',requisitionId:'P',orderedAt:start,arrivedAt:null,completedAt:null};
 const later={...pending,requisitionId:'F',arrivedAt,completedAt:'2026-10-21'};
 const summary=items=>context.ipRefurbSummary([{refurbOrders:items}],end);
 const result=summary([...rows,rows[0],pending,later]);
 assert.equal(result.total,8,'仅计已完成交付，按采购单＋SKU去重');
 assert.equal(result.completed,8);
 assert.equal(result.onTime,2,'下单后第33天计入达标，34天不计入');
 assert.equal(result.rate,25);
 assert.equal(summary([pending,later]).rate,null,'本期无完成交付的采购单');
 assert.equal(summary([]).rate,null,'无采购单时不造0%');
 assert.equal(summary([{...rows[0],arrivedAt:null}]).rate,100);
 assert.equal(summary([rows[0],{...rows[0],skuId:'SKU-B'},rows[0]]).total,2,'同单不同SKU分别计，同单同SKU去重');
 assert.deepEqual(Array.from(result.buckets,row=>row.count),[2,2,2,2],'33/45/60天边界互斥');
 assert.equal(summary([rows[1],rows[2]]).rate,50,'同SKU两单分别在第33天和第34天完成');
 assert.equal(summary([{...rows[0],orderedAt:null}]).rate,null,'已完成但缺少下单日时无法判断是否达标');
 const ordered=[
  {...pending,requisitionId:'OLD',orderedAt:'2025-12-31',completedAt:'2026-10-01'},
  {...pending,requisitionId:'LAST',orderedAt:'2026-09-23',completedAt:'2026-10-31'},
  {...pending,requisitionId:'SEP',orderedAt:'2026-09-30',arrivedAt:'2026-10-03',completedAt:'2026-10-05'},
  {...pending,requisitionId:'OCT-A',orderedAt:'2026-10-01',arrivedAt:'2026-10-15',completedAt:'2026-11-10'},
  {...pending,requisitionId:'OCT-B',orderedAt:'2026-10-31',arrivedAt:'2026-11-02'},
  {...pending,requisitionId:'NOV',orderedAt:'2026-11-01'}
 ];
 const october=context.ipRefurbPeriodOrders([...ordered,ordered[1]],'2026-10-01','2026-10-31');
 assert.deepEqual(Array.from(october,row=>row.requisitionId),['OLD','LAST','SEP'],'按完成日归期，含首尾日期和跨年采购单');
 assert.equal(context.ipRefurbSummary([{refurbOrders:october}],'2026-10-31').onTime,1);
 assert.equal(context.ipRefurbSummary([{refurbOrders:october}],'2026-10-31').total,3);
 const card=page.locator('#inventory [data-stock-card="refurb"]'),data=await page.evaluate(()=>inventoryControlAudit().overview.refurb);
 assert.equal(data.completed,data.total,'分母只含本期完成交付的单');
 assert.equal(data.buckets.reduce((n,row)=>n+row.count,0),data.completed);
 assert.equal(data.onTime,data.buckets[0].count);assert.equal(data.rate,data.total?data.onTime/data.total*100:null);
 assert(data.completed>0&&data.onTime<data.completed,'样例同时包含达标和超期完成');
 assert.equal(Number(await card.locator('[data-stock-refurb-rate]').getAttribute('data-stock-refurb-rate')),data.rate);
 assert.equal(await card.locator('[data-refurb-bucket]').count(),0,'卡片不常驻展示四档分布');
 assert.equal(await card.locator('.stock-card-foot').count(),0,'不展示已完成和未完成底栏');
 const rate=card.locator('.ip-refurb-rate'),tip=page.locator('#metric-tooltip');
 assert.equal(await rate.getAttribute('data-ip-refurb-distribution'),null);assert.equal(await rate.evaluate(node=>node.tagName),'BUTTON');
 await rate.hover();assert(await tip.isHidden(),'分布使用独立浮层');await verifyRefurbDistribution(page,rate,data);
 const help=card.locator('[data-ip-overview-help="refurb"]');
 await help.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await help.hover();await tip.waitFor({state:'visible'});
 assert.equal(await tip.innerText(),'翻新闭环率＝本期完成交付且距采购下单日不超过33天的单数÷本期完成交付的总单数。按采购单＋SKU分别计数。');
 assert(!(await tip.innerText()).includes('数据截止'));assert(!(await tip.innerText()).includes('汇总方式'));
 assert(await tip.evaluate(e=>{const box=e.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight}));
 await page.keyboard.press('Escape');
 // 类目、品牌及其下钻同用该行的统计，而非全局卡片分布。
 const all=await page.evaluate(()=>inventoryControlAudit());
 const selectedOrders=all.stockRecords.flatMap(row=>row.refurbOrders);
 assert(selectedOrders.some(row=>row.orderedAt<all.overview.range.start),'取到前期下单、本期完成的样例');
 assert.equal(data.total,new Set(selectedOrders.map(row=>JSON.stringify([row.requisitionId,row.skuId]))).size,'卡片总数来自请购单事实');
 assert(data.total>new Set(all.stockRecords.filter(row=>row.refurbOrders.length).map(row=>row.spuId)).size,'同SPU多张请购单分别纳入');
 assert((await card.innerText()).includes('未翻新件数'));assert(!(await card.innerText()).includes('未完成请购单数'));assert(!(await card.innerText()).includes('SKU'));
 const stock=all.stockRecords.reduce((sum,row)=>sum+row.unrefurbishedUnits,0);
 assert.equal(all.overview.unrefurbishedUnits,stock);
 assert.equal(await card.locator('[data-stock-refurb-pending]').innerText(),stock.toLocaleString('en-US')+'件');
 assert.equal(await card.locator('.stock-card-share').count(),0);
 const pendingHelp=card.locator('[data-stock-rule="unrefurbishedUnits"]');
 await pendingHelp.focus();await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});
 assert.equal(await tip.innerText(),'未翻新＝翻新请购总量－翻新请购交付量－工厂翻新良品库存');await page.keyboard.press('Escape');
 assert(selectedOrders.every(row=>row.spuId),'每张请购单明确归属SPU');

 for(const [dimension,groups] of [['category',all.category],['brand',all.brand]]){
  assert.equal(groups.reduce((n,row)=>n+row.refurb.total,0),all.overview.refurb.total);
  assert.equal(groups.reduce((n,row)=>n+row.refurb.onTime,0),all.overview.refurb.onTime);
  const panel=page.locator('#inventory [data-ip-dimension="'+dimension+'"].ip-group-panel');
  assert.equal(await panel.locator('[data-rp-sort="refurbRate"]').innerText(),'翻新闭环率');
  assert.equal(await panel.locator('[data-rp-sort="refurbDelay"]').count(),0);
  const cell=panel.locator('tbody [data-ip-metric="refurbRate"]').first(),value=cell.locator('.ip-refurb-rate');
  assert.equal(await value.getAttribute('data-metric-rule'),null);
  await value.hover();assert(await tip.isHidden(),'两表使用独立浮层');const index=await cell.locator('..').getAttribute('data-ip-row');await verifyRefurbDistribution(page,value,groups.find(row=>String(row.index)===index).refurb);
 }
 for(const width of [390,320]){await page.setViewportSize({width,height:800});await verifyRefurbDistribution(page,card.locator('.ip-refurb-rate'),(await page.evaluate(()=>inventoryControlAudit())).overview.refurb)}
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#inventory .ip-group-scroll').evaluateAll(es=>es.forEach(e=>e.scrollLeft=0));
 console.log('通过：翻新采购单去重与完成月份归属、33/45/60天边界、卡片/类目/品牌悬浮分布、鼠标/键盘/窄屏、保留问号公式');
}

export async function verifyRefurbDistribution(page,trigger,model){
 const panel=page.locator('#ip-refurb-distribution');assert.deepEqual(JSON.parse(await trigger.getAttribute('data-ip-refurb-summary')),model);
 await trigger.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await trigger.hover();await panel.waitFor({state:'visible'});assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.equal(await panel.locator('button').count(),0,'浮层不保留关闭按钮');
 assert.deepEqual(await panel.locator('[data-refurb-bucket]').evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.refurbBucket,label:node.querySelector('span').textContent,count:Number(node.querySelector('b').textContent.replaceAll(',',''))}))),model.buckets);
 assert.match(await panel.locator('.stock-refurb-tip-summary').first().innerText(),new RegExp('达标 '+model.onTime+' 单 / 本期完成 '+model.total+' 单'));
 assert(await panel.evaluate(node=>{const box=node.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight}));
 await panel.hover();await page.waitForTimeout(350);assert(await panel.isVisible(),'移入浮层继续阅读');await page.mouse.move(0,0);await panel.waitFor({state:'hidden'});assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 await trigger.focus();await panel.waitFor({state:'visible'});await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
 await trigger.press('Space');await panel.waitFor({state:'visible'});await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});await trigger.evaluate(e=>e.blur());
}

export async function refurbDelayRemoval(page){
 const context=businessRuleContext({window:{},periodFor:()=>({mode:'quarter'}),fmt:String,numberSignal:value=>value,esc:String,bindRender:(_key,render)=>render});
 for(const file of ['02-rules.js','03-view.js'])vm.runInContext(readFileSync(new URL('../../src/modules/inventory-period/'+file,import.meta.url),'utf8'),context);
 assert.equal(vm.runInContext("brcDefinitions.some(rule=>rule.key.startsWith('lights.refurb.'))||brcBands.some(band=>band.id==='refurb')",context),false,'删除延期条件和阈值');
 assert.equal(vm.runInContext("'refurb' in ipMetricRules||'refurb' in ipThresholds",context),false,'删除旧提示和阈值投影');
 const legacy=context.ipSummaryCards({num:100,amountCents:20000,turn:3,staleCents:1000,delivery:99});
 assert.equal((legacy.match(/<strong>/g)||[]).length,5,'旧部门汇总仅保留五项且正常渲染');
 assert(!legacy.includes('翻新延期'));
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();
 await page.locator('[data-brc-tab="stock"]').click();
 const stock=await page.evaluate(()=>window.businessRuleConfigSnapshot());
 assert(!stock.items.some(item=>item.key.startsWith('lights.refurb.')));
 const tabs=page.locator('[data-brc-section-tab]');
 const titles=await tabs.allTextContents();
 assert(titles.some(title=>title.includes('库存周转率'))&&titles.some(title=>title.includes('交付及时率')));
 assert(titles.every(title=>!title.includes('翻新')),'库存配置仅保留周转率和交付判灯');
 await page.goto(page.url().split('#')[0]);
 await page.locator('a[href="#inventory"]').click();
 await verifyInventoryRefurb(page);
}
