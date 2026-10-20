import assert from 'node:assert/strict';
// 验证图例、产品等级及真实坐标落区一致，覆盖月份累计值不能替代评级窗口。
export async function verifyKeyProductChart(page){
 const root=page.locator('#matrix'),snapshot=await page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const expectedNames=['S 头部利润支柱','A 高销低利','B 潜力利润品','C 尾部无竞争力'];
 assert.deepEqual(await root.locator('.kpm-chart-legend>span').allTextContents(),expectedNames,'保留原SABC名称，图例仅四项');
 assert.doesNotMatch(await root.locator('.kpm-chart-head').innerText(),/待分级/);
 const legend=await root.locator('.kpm-chart-head').evaluate(e=>{
  const title=e.querySelector('h3').getBoundingClientRect(),legend=e.querySelector('.kpm-chart-legend').getBoundingClientRect(),items=[...e.querySelectorAll('.kpm-chart-legend>span')].map(n=>n.getBoundingClientRect());
  return {below:legend.top>=title.bottom,sameLine:items.every(r=>Math.abs(r.top-items[0].top)<1),right:legend.right};
 });
 assert(legend.below&&legend.sameLine,'四项图例位于标题下方，同一行显示');
 assert(legend.right<=page.viewportSize().width,'图例不撑破页面');

 assert.doesNotMatch(await root.locator('#matrixchart').innerText(),/待分级|高销高利|低销高利|低销低利/);
 const chart=await root.locator('#matrixchart svg').evaluate(svg=>({
  zones:[...svg.querySelectorAll('[data-quadrant]')].map(e=>({grade:e.dataset.quadrant,x:+e.getAttribute('x'),y:+e.getAttribute('y'),width:+e.getAttribute('width'),height:+e.getAttribute('height')})),
  points:[...svg.querySelectorAll('circle')].map(e=>({id:e.dataset.kpmPoint,grade:e.dataset.kpmGradePoint,x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),fill:e.getAttribute('fill'),aria:e.getAttribute('aria-label')}))
 }));
 assert.deepEqual(chart.zones.map(z=>z.grade),['S','A','B','C']);
 assert.deepEqual(chart.points.map(p=>p.id).sort(),snapshot.visible.filter(p=>p.level&&p.assessment.current.sales>0).map(p=>p.spuId).sort());
 const colors={S:'#35ac8e',A:'#e7ad50',B:'#7c8eec',C:'#e98191'};
 for(const p of chart.points){
  const row=snapshot.rows.find(r=>r.spuId===p.id),zone=chart.zones.find(z=>z.grade===row.level);
  assert.equal(p.grade,row.level);assert.equal(p.fill,colors[row.level]);assert.doesNotMatch(p.aria,/待分级/);
  assert(p.x>=zone.x-1e-8&&p.x<=zone.x+zone.width+1e-8&&p.y>=zone.y-1e-8&&p.y<=zone.y+zone.height+1e-8,'产品坐标必须落入同一SABC区域：'+p.id);
 }
}
