import {verifyNewProductChannelLayout} from './new-products-channel-layout.mjs';
import assert from 'node:assert/strict';
export async function verifyNewProductUnsoldDrawer(page){
 const entry=page.locator('#newtop [data-nsp-unsold]');
 const drawer=page.locator('#dialog.drawer');
 assert.equal(await entry.innerText(),'4');
 await entry.click();
 assert.equal(await drawer.locator('#dialogtitle').innerText(),'已提货未销售');
 assert.equal(await drawer.locator('#dialogsub').innerText(),'数据截至 26/11/11');
 assert.equal(await drawer.locator('.nsp-unsold-notice strong').innerText(),'已完成部分/全部交付后，未检测到渠道首个订单的产品清单');
 assert.deepEqual((await drawer.locator('th').allTextContents()).map(text=>text.trim()),['产品信息','首批请购单号','首批单状态','我司可售库存','计划上市日期','承接运营','产品经理']);
 assert.deepEqual(await drawer.locator('tbody td:nth-child(3)').allTextContents(),['交付完成','交付完成','交付完成','交付中']);
 assert.deepEqual(await drawer.locator('tbody td:nth-child(4)').allTextContents(),['360 件','240 件','120 件','60 件']);
 assert.deepEqual(await drawer.locator('tbody td:nth-child(5)').allTextContents(),['26/11/18','26/11/20','26/11/24','—']);
 await drawer.getByRole('button',{name:'查看计划上市日期指标口径'}).hover();
 assert.match(await page.locator('#metric-tooltip').innerText(),/取自 SPU 关联项目的计划完成日期/);
 assert.deepEqual(await drawer.locator('tbody td:nth-child(6)').allTextContents(),['周晓_兴趣电商','许晨_一类电商','—','—']);
 await drawer.getByRole('button',{name:'查看承接运营指标口径'}).hover();
 assert.equal(await page.locator('#metric-tooltip').innerText(),'取数口径：取自 SPU 关联项目的承接运营。');
 const pager=drawer.getByRole('navigation',{name:'列表分页'});
 assert.equal(await pager.locator('.list-page-total').innerText(),'共 4 条');
 await pager.getByRole('combobox',{name:'每页条数'}).selectOption('10');
 assert.equal(await pager.getAttribute('data-list-size'),'10');
 const search=drawer.getByRole('searchbox');
 await search.fill('DEMO-NEW-031');
 assert.equal(await pager.locator('.list-page-total').innerText(),'共 1 条');
 assert.equal(await drawer.locator('tbody tr').count(),1);
 assert.match(await drawer.locator('tbody').innerText(),/创维语音取暖器 H26/);
 assert.equal(await drawer.locator('tbody td:nth-child(3)').innerText(),'交付中');
 await drawer.locator('#close').click();
 assert.equal(await entry.innerText(),'4');
 await page.locator('#nsp-season-tabs [data-nsp-season="冬季品"]').click();
 assert.equal(await entry.innerText(),'2');
 await entry.click();
 assert.match(await drawer.locator('tbody').innerText(),/DEMO-NEW-026/);
 await drawer.locator('#close').click();
 await page.locator('#nsp-season-tabs [data-nsp-season="all"]').click();
}

export async function verifyNewProductOperatingTotals(page,rows,prefix){
 const sales=page.locator('#newtop [data-nsp-operating="sales"]'),margin=page.locator('#newtop [data-nsp-operating="margin"]');
 const gsv=rows.reduce((sum,row)=>sum+row.current.gsvCents,0);
 const profit=rows.reduce((sum,row)=>sum+row.current.profitCents,0);
 assert.equal(await sales.getAttribute('data-value'),rows.length?String(gsv):'');
 assert.equal(await margin.getAttribute('data-value'),gsv>0?String(profit/gsv*100):'');
 if(prefix){
  assert.equal(await sales.locator('span').innerText(),prefix+'新品总销售额');
  assert.equal(await margin.locator('span').innerText(),prefix+'新品总利润率');
 }
 if(gsv>0)assert.equal(await margin.locator('strong').innerText(),(profit/gsv*100).toFixed(1)+'%');
}
export async function verifyNewProductOverview(page){
 const s=await page.evaluate(()=>window.dashboardNewProductsSnapshot()),scope=s.filtered,pool=scope.filter(p=>p.inNewPool),root=page.locator('#newtop');
 const included=s.successScope.filter(p=>p.successAssessment.included),success=included.filter(p=>p.salesSuccess).length;
 assert.equal(s.success.total,included.length);assert.equal(s.success.success,success);
 assert.match(await root.locator('[data-nsp-metric="sold"] small').innerText(),new RegExp(`成功 ${success}个 / 纳入统计 ${included.length}个`));
 await verifyNewProductOperatingTotals(page,pool);
 const bands=[['under100',0,10000],['100-200',10000,20000],['200-300',20000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]];
 assert.equal(await root.locator('[data-nsp-price]').count(),bands.length);
 for(const [key,min,max] of bands){const expected=s.priceDistribution.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents>=min&&p.priceCents<max).length,button=root.locator('[data-nsp-price="'+key+'"]');assert.equal(Number(await button.getAttribute('data-price-count')),expected,'价格分布保留其他筛选，忽略价格自身：'+key);if(!expected){assert.equal(await button.locator('strong').innerText(),'—');assert.equal(await button.locator('.nsp-price-empty').innerText(),'暂无产品')}}
 assert.equal(await root.locator('[data-nsp-status]').count(),0,'销售状态分布已替换为价格带分布');
 const {planned,ontime}=s.timeliness;
 assert.equal(await root.locator('[data-nsp-static-metric="ontime"] small').innerText(),`按期完成 ${ontime} / 应上市项目 ${planned}`);
 const expectedChannels=await page.evaluate(()=>window.FilterCatalog.platforms);
 assert.deepEqual(await root.locator('.nsp-channel-labels button img').evaluateAll(ns=>ns.map(n=>n.alt)),expectedChannels,'六平台完整且顺序固定');
 for(const [channel,text,hasBar] of await root.locator('svg [data-nsp-channel]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspChannel,n.querySelector('text').textContent,!!n.querySelector('rect:not(.nsp-channel-hit)')]))){
  const known=pool.map(p=>p.platformFacts.find(f=>f.platform===channel)?.gsvCents).filter(Number.isFinite);
  if(!known.length){assert.equal(text,'—','缺平台业绩不冒充零业绩');assert.equal(hasBar,false);continue;}
  const expected=known.reduce((a,b)=>a+b,0)/1000000,value=Number(text.replaceAll(',',''));
  assert(Math.abs(value-expected)<=.051,'平台GSV按筛选后产品汇总：'+channel);
 }
 const hoverBounds=await root.locator('.nsp-channels').evaluate(el=>{
  const axis=el.querySelector('.nsp-channel-labels').getBoundingClientRect();
  return [...el.querySelectorAll('.nsp-channel-hit')].every(hit=>hit.getBoundingClientRect().bottom<axis.top);
 });
 assert(hoverBounds,'渠道悬浮底色限制在绘图区，不进入横坐标区域');
 await verifyNewProductChannelLayout(page);
 const overviewSpacing=await root.evaluate(el=>{
  const panels=[...el.children],cards=[...el.querySelectorAll('.newmetric')];
  return panels.every(panel=>panel.getBoundingClientRect().height>=247)
   &&cards.every(card=>{const style=getComputedStyle(card),min=card.closest('.nsp-primary-kpis')?12:16;return parseFloat(style.paddingTop)>=min&&parseFloat(style.paddingBottom)>=min})
   &&[...el.querySelectorAll('[data-nsp-price]')].every(row=>row.getBoundingClientRect().height>=28);
 });
 assert(overviewSpacing,'概览、指标卡与价格行均保留阅读空间');
 const expected=pool.map(p=>p.spuId).sort();
 assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected,'表格与图表共用成功状态等筛选，仅额外应用在池范围');
}
