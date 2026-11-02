import {verifyNewProductChannelLayout} from './new-products-channel-layout.mjs';
import assert from 'node:assert/strict';
export async function verifyNewProductOverview(page){
 const s=await page.evaluate(()=>window.dashboardNewProductsSnapshot()),scope=s.filtered,pool=scope.filter(p=>p.inNewPool),root=page.locator('#newtop');
 const included=s.successScope.filter(p=>p.successAssessment.included),success=included.filter(p=>p.salesSuccess).length;
 assert.equal(s.success.total,included.length);assert.equal(s.success.success,success);
 assert.match(await root.locator('[data-nsp-metric="sold"] small').innerText(),new RegExp(`成功 ${success}个 / 纳入统计 ${included.length}个`));
 assert.equal(await root.locator('.dp-ring').getAttribute('aria-label'),'共'+pool.length+'个新品');
 for(const [grade,count] of await root.locator('.dp-legend [data-nsp-grade]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspGrade,parseInt(n.querySelector('b').textContent)])))assert.equal(count,pool.filter(p=>grade==='unrated'?!p.grade:p.grade===grade).length,'等级分布随所有筛选联动');
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
   &&cards.every(card=>{const style=getComputedStyle(card);return parseFloat(style.paddingTop)>=16&&parseFloat(style.paddingBottom)>=16})
   &&[...el.querySelectorAll('[data-nsp-price]')].every(row=>row.getBoundingClientRect().height>=28);
 });
 assert(overviewSpacing,'概览、指标卡与价格行均保留阅读空间');
 const expected=pool.map(p=>p.spuId).sort();
 assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected,'表格与图表共用成功状态等筛选，仅额外应用在池范围');
}
