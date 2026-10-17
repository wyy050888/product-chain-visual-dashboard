import assert from 'node:assert/strict';
export async function verifyNewProductOverview(page){
 const s=await page.evaluate(()=>window.dashboardNewProductsSnapshot()),scope=s.filtered,pool=scope.filter(p=>p.inNewPool),root=page.locator('#newtop');
 const included=scope.filter(p=>p.successAssessment.included),success=included.filter(p=>p.salesSuccess).length;
 assert.equal(s.success.total,included.length);assert.equal(s.success.success,success);
 assert.match(await root.locator('[data-nsp-metric="sold"] small').innerText(),new RegExp(`成功 ${success}款 / 纳入统计 ${included.length}款`));
 assert.equal(await root.locator('.dp-ring').getAttribute('aria-label'),'共'+pool.length+'款新品');
 for(const [grade,count] of await root.locator('.dp-legend [data-nsp-grade]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspGrade,parseInt(n.querySelector('b').textContent)])))assert.equal(count,pool.filter(p=>p.grade===grade).length,'等级分布随所有筛选联动');
 for(const [status,count] of await root.locator('[data-nsp-status]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspStatus,parseInt(n.querySelector('strong').textContent)])))assert.equal(count,pool.filter(p=>p.state===status).length,'销售状态分布随所有筛选联动');
 const planned=scope.filter(p=>p.inPlan).length,ontime=scope.filter(p=>p.onTime).length;
 assert.equal(await root.locator('[data-nsp-metric="ontime"] small').innerText(),`按期上线 ${ontime} / 本期计划 ${planned}`);
 for(const [channel,value] of await root.locator('[data-nsp-channel]').evaluateAll(ns=>ns.map(n=>[n.dataset.nspChannel,Number(n.querySelector('text').textContent.replaceAll(',',''))]))){
  const expected=pool.reduce((n,p)=>n+p.channelFacts.find(f=>f.channel===channel).gsvCents,0)/1000000;
  assert(Math.abs(value-expected)<=.051,'各渠道GSV按筛选后产品重新汇总：'+channel);
 }
 const expected=pool.filter(p=>s.metric==='all'||(s.metric==='sold'?p.salesSuccess:p.onTime)).map(p=>p.spuId).sort();
 assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected,'表格沿用同一筛选范围，仅额外应用在池及卡片下钻');
}
