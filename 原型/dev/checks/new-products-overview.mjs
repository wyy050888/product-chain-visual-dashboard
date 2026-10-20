import assert from 'node:assert/strict';
export async function verifyNewProductOverview(page){
 const s=await page.evaluate(()=>window.dashboardNewProductsSnapshot()),scope=s.filtered,pool=scope.filter(p=>p.inNewPool),root=page.locator('#newtop');
 const included=scope.filter(p=>p.successAssessment.included),success=included.filter(p=>p.salesSuccess).length;
 assert.equal(s.success.total,included.length);assert.equal(s.success.success,success);
 assert.match(await root.locator('[data-nsp-metric="sold"] small').innerText(),new RegExp(`成功 ${success}个 / 纳入统计 ${included.length}个`));
 assert.equal(await root.locator('.dp-ring').getAttribute('aria-label'),'共'+pool.length+'个新品');
 for(const [grade,count] of await root.locator('.dp-legend [data-nsp-grade]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspGrade,parseInt(n.querySelector('b').textContent)])))assert.equal(count,pool.filter(p=>p.grade===grade).length,'等级分布随所有筛选联动');
 const bands=[['under100',0,10000],['100-300',10000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]];
 assert.equal(await root.locator('[data-nsp-price]').count(),bands.length);
 for(const [key,min,max] of bands){const expected=s.priceDistribution.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents>=min&&p.priceCents<max).length;assert.equal(parseInt(await root.locator('[data-nsp-price="'+key+'"] strong').textContent()),expected,'价格分布保留其他筛选，忽略价格自身：'+key)}
 assert.equal(await root.locator('[data-nsp-status]').count(),0,'销售状态分布已替换为价格带分布');
 const {planned,ontime}=s.timeliness;
 assert.equal(await root.locator('[data-nsp-metric="ontime"] small').innerText(),`按期完成 ${ontime} / 应上线项目 ${planned}`);
 for(const [channel,value] of await root.locator('[data-nsp-channel]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspChannel,Number(n.querySelector('text').textContent.replaceAll(',',''))]))){
  const expected=pool.reduce((n,p)=>n+p.channelFacts.find(f=>f.channel===channel).gsvCents,0)/1000000;
  assert(Math.abs(value-expected)<=.051,'各渠道GSV按筛选后产品重新汇总：'+channel);
 }
 const expected=pool.filter(p=>s.metric==='all'||(s.metric==='sold'?p.salesSuccess:p.onTime)).map(p=>p.spuId).sort();
 assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected,'表格沿用同一筛选范围，仅额外应用在池及卡片下钻');
}
