import assert from 'node:assert/strict';
// 圆点、分区与同周期等级事实一致；未命中产品不能消失或被强行分级。
export async function verifyKeyProductChart(page){
 const root=page.locator('#matrix'),snapshot=await page.evaluate(()=>dashboardKeyProductsSnapshot());
 assert.deepEqual(await root.locator('.kpm-chart-legend>span').allTextContents(),['S 头部利润支柱','A 高销低利','B 潜力利润品','C 尾部无竞争力','未分级']);
 const chart=await root.locator('#matrixchart svg').evaluate(svg=>({
  background:svg.querySelector('[data-kpm-unmatched-area]')?.getAttribute('fill'),
  zones:[...svg.querySelectorAll('[data-quadrant]')].map(e=>({grade:e.dataset.quadrant,x:+e.getAttribute('x'),y:+e.getAttribute('y'),width:+e.getAttribute('width'),height:+e.getAttribute('height')})),
  points:[...svg.querySelectorAll('circle')].map(e=>({id:e.dataset.kpmPoint,grade:e.dataset.kpmGradePoint,x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),fill:e.getAttribute('fill'),aria:e.getAttribute('aria-label')}))
 }));
 assert.equal(chart.background,'#f1f4f8');assert.deepEqual(chart.zones.map(z=>z.grade),['S','A','B','C']);
 const visible=snapshot.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate));
 assert.deepEqual(chart.points.map(p=>p.id).sort(),visible.map(p=>p.spuId).sort());
 const colors={S:'#35ac8e',A:'#e7ad50',B:'#7c8eec',C:'#e98191',unrated:'#98a5b6'};
 for(const p of chart.points){
  const row=snapshot.rows.find(r=>r.spuId===p.id),level=row.level||'unrated';
  assert.equal(p.grade,level);assert.equal(p.fill,colors[level]);
  if(!row.level){assert.match(p.aria,/未分级/);continue}
  const zone=chart.zones.find(z=>z.grade===row.level);
  assert(p.x>=zone.x-1e-8&&p.x<=zone.x+zone.width+1e-8&&p.y>=zone.y-1e-8&&p.y<=zone.y+zone.height+1e-8,'坐标落入自身等级区域 '+p.id);
 }
}
