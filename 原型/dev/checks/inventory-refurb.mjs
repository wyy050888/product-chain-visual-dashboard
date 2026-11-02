import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyInventoryRefurb(page){
 const context=businessRuleContext({fmt:String,upMoney:String,aiFlowDayDiff:(start,end)=>(Date.parse(end)-Date.parse(start))/86400000});
 vm.runInContext(readFileSync(new URL('../../src/modules/inventory-period/02-refurb.js',import.meta.url),'utf8'),context);
 vm.runInContext(readFileSync(new URL('../../src/modules/ui-controls/00-stock-quantity.js',import.meta.url),'utf8'),context);
 vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/06-stock-model.js',import.meta.url),'utf8'),context);
 const end='2026-10-20',start='2026-07-01',quotedAt='2026-07-03',day=n=>new Date(Date.parse(quotedAt)+n*86400000).toISOString().slice(0,10);
 // 同SPU多张单分别统计；相同请购单展开到多个SKU仍只计一次。
 const rows=[39,40,41,44,45,59,60,72].map((days,i)=>({spuId:'same-spu',requisitionId:'R'+i,initiatedAt:start,quotedAt,completedAt:day(days)}));
 rows.push({spuId:'same-spu',requisitionId:'P',initiatedAt:start,quotedAt,completedAt:null});
 rows.push({spuId:'same-spu',requisitionId:'F',initiatedAt:start,quotedAt,completedAt:'2026-10-21'});
 const summary=items=>context.ipRefurbSummary([{refurbOrders:items}],end);
 const result=summary([...rows,rows[0],{requisitionId:'invalid',initiatedAt:start},{spuId:'never-refurbished'}]);
 assert.equal(result.total,8,'仅统计已完成请购单，按单去重，不把同SPU的多张单合并');
 assert.equal(result.onTime,2,'第40天计入达标，41天不计入');assert.equal(result.rate,25);
 assert.equal(summary([rows[8],rows[9]]).rate,null,'仅有未完成单时无已完成分母，显示缺失而非0%');
 assert.equal(summary([rows[2]]).rate,0,'已完成但超期时为真实0%');
 assert.deepEqual(Array.from(result.buckets,row=>row.count),[2,2,2,2],'40/45/60天边界互斥');
 assert.equal(context.ipRefurbSummary([],end).rate,null,'无请购单时不造0%');
 assert.equal(summary([{...rows[0],quotedAt:null}]).rate,null,'缺报价完结时间不冒充有效周期');
 const cohort=[
  {spuId:'same',requisitionId:'SEP',initiatedAt:'2026-09-30',quotedAt:'2026-10-01',completedAt:'2026-10-20'},
  {spuId:'same',requisitionId:'OCT-A',initiatedAt:'2026-10-01',quotedAt:'2026-10-03',completedAt:'2026-11-12'},
  {spuId:'same',requisitionId:'OCT-B',initiatedAt:'2026-10-02',quotedAt:'2026-10-04',completedAt:'2026-10-20'},
  {spuId:'same',requisitionId:'NOV',initiatedAt:'2026-11-01',quotedAt:'2026-11-02',completedAt:null}
 ];
 cohort.push(
  {spuId:'same',requisitionId:'OLD',initiatedAt:'2025-12-01',quotedAt:'2025-12-03',completedAt:'2026-10-31'},
  {spuId:'same',requisitionId:'START',initiatedAt:'2026-08-01',quotedAt:'2026-08-03',completedAt:'2026-10-01'},
  {spuId:'same',requisitionId:'BEFORE',initiatedAt:'2026-08-01',quotedAt:'2026-08-03',completedAt:'2026-09-30'},
  {spuId:'same',requisitionId:'INVALID',quotedAt:'2026-10-01',completedAt:'2026-10-32'}
 );
 const select=(start,end)=>context.ipRefurbPeriodOrders([...cohort,{...cohort[0],skuId:'another-sku'}],start,end);
 const selected=select('2026-10-01','2026-10-31');
 assert.deepEqual(Array.from(selected,row=>row.requisitionId),['SEP','OCT-B','OLD','START'],'按交付完成日筛选且含边界；跨月/跨年发起仍纳入，未完成和区间外完成排除');
 const oct=context.ipRefurbSummary([{refurbOrders:selected}],'2026-10-31');
 assert.equal(oct.total,4);assert.equal(oct.onTime,2);assert.equal(oct.rate,50);
 const nov=context.ipRefurbSummary([{refurbOrders:select('2026-11-01','2026-11-30')}],'2026-11-30');
 assert.equal(nov.total,1);assert.equal(nov.onTime,1);assert.equal(nov.rate,100,'10月发起11月完成归11月，40天周期从报价完结计算');
 const card=page.locator('#inventory [data-stock-card="refurb"]'),data=await page.evaluate(()=>inventoryControlAudit().overview.refurb);
 assert.equal(data.completed,data.total);
 assert.equal(data.buckets.reduce((n,row)=>n+row.count,0),data.completed);
 assert.equal(data.onTime,data.buckets[0].count);assert.equal(data.rate,data.completed?data.onTime/data.completed*100:null);
 assert(data.completed>0&&data.onTime<data.completed,'样例同时包含40天内及超期完成，避免只展示当月新发起的短周期单');
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
 assert.match(await tip.getAttribute('class'),/metric-tooltip-stock-refurb/);
 const limit=40;
 for(const text of ['≤ '+limit+'天','包含第40天完成的请购单','请购单交付完成日期','报价完结时间','按翻新交付完成日期筛选'])assert((await tip.innerText()).includes(text),text);
 assert((await tip.innerText()).includes('÷ 已完成翻新请购单数'));
 assert(!(await tip.innerText()).includes('数据截止'));assert(!(await tip.innerText()).includes('汇总方式'));
 assert(await tip.evaluate(e=>{const box=e.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight}));
 await page.keyboard.press('Escape');
 // 类目、品牌及其下钻同用该行的统计，而非全局卡片分布。
 const all=await page.evaluate(()=>inventoryControlAudit());
 const selectedOrders=all.stockRecords.flatMap(row=>row.refurbOrders);
 assert.equal(data.total,new Set(selectedOrders.map(row=>row.requisitionId)).size,'卡片总数来自请购单事实');
 assert(data.total>new Set(all.stockRecords.filter(row=>row.refurbOrders.length).map(row=>row.spuId)).size,'同SPU多张请购单分别纳入');
 assert((await card.innerText()).includes('未翻新数'));assert(!(await card.innerText()).includes('未完成请购单数'));assert(!(await card.innerText()).includes('SKU'));
 const stock=all.overview.unrefurbished;
 const skus=new Map(all.stockRecords.flatMap(row=>row.unrefurbishedSkus).map(row=>[row.skuId,row]));
 assert.equal(stock.total,skus.size);assert.equal(stock.pending,[...skus.values()].filter(row=>row.pending).length);
 assert(stock.pending>0,'原未翻新数保持独立取数，不因闭环率排除未完成单而清零');
 const duplicate=context.ipUnrefurbishedSummary([{unrefurbishedSkus:[{skuId:'A',pending:true},{skuId:'B',pending:false},{skuId:'A',pending:true}]}]);
 assert.equal(duplicate.total,2);assert.equal(duplicate.pending,1);assert.equal(duplicate.share,50);
 assert.equal(await card.locator('[data-stock-refurb-pending]').innerText(),stock.pending.toLocaleString('en-US'));
 assert.equal(await card.locator('.stock-refurb-pending .stock-card-share').innerText(),'（'+(stock.share===null?'—':stock.share.toFixed(1)+'%')+'）','未翻新数保留原SKU数量及占比');
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
 console.log('通过：翻新请购单去重与交付月份归属、40/45/60天边界、卡片/类目/品牌悬浮分布、鼠标/键盘/窄屏、保留问号公式');
}

export async function verifyRefurbDistribution(page,trigger,model){
 const panel=page.locator('#ip-refurb-distribution');assert.deepEqual(JSON.parse(await trigger.getAttribute('data-ip-refurb-summary')),model);
 await trigger.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await trigger.hover();await panel.waitFor({state:'visible'});assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.equal(await panel.locator('button').count(),0,'浮层不保留关闭按钮');
 assert.deepEqual(await panel.locator('[data-refurb-bucket]').evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.refurbBucket,label:node.querySelector('span').textContent,count:Number(node.querySelector('b').textContent.replaceAll(',',''))}))),model.buckets);
 assert.match(await panel.locator('.stock-refurb-tip-summary').first().innerText(),new RegExp('达标 '+model.onTime+' / 已完成 '+model.completed+' 单'));
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
