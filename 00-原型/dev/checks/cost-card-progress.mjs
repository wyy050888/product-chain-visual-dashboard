import assert from 'node:assert/strict';
// 与实现独立计算：每张卡的期间边界、闰年天数与所选截止日均使用UTC日期。
export async function verifyCostCardProgress(page){
 const {period,totals}=await page.evaluate(()=>window.costControlAudit()),anchor=period.mode==='month'?period.value:period.mode==='quarter'?period.value*3:12;
 const today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
 const selectedEnd=new Date(Date.UTC(period.year,anchor,0)).toISOString().slice(0,10),cutoff=selectedEnd<today?selectedEnd:today,day=86400000;
 for(const card of await page.locator('[data-cc-card]').all()){
  const mode=await card.getAttribute('data-cc-card'),first=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+1:1,last=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+3:12;
  const label=mode==='month'?anchor+'月':mode==='quarter'?'Q'+Math.ceil(anchor/3):String(period.year).slice(-2)+'年';
  assert.equal(await card.locator('h3').innerText(),label+'降本');assert(await page.locator('#costtable th').allTextContents().then(headers=>headers.includes(label+'实际/目标降本')&&headers.includes(label+'达成')&&headers.includes(label+'差额')),'表头与所选月/季/年一致');
  const start=Date.UTC(period.year,first-1,1),end=Date.UTC(period.year,last,0),days=(end-start)/day+1,elapsed=Math.max(0,Math.min(days,(Date.parse(cutoff+'T00:00:00Z')-start)/day+1)),expected=elapsed/days*100;
  const marker=card.locator('[data-cc-time-progress]');assert.equal(await marker.count(),1);assert(Math.abs(+(await marker.getAttribute('data-cc-time-progress'))-expected)<1e-8);
  const track=card.locator('.ms-progress'),{r,m}=await card.evaluate(e=>({r:e.querySelector('.ms-progress').getBoundingClientRect().toJSON(),m:e.querySelector('.ms-time-marker').getBoundingClientRect().toJSON()}));assert(Math.abs(m.x+m.width/2-(r.x+r.width*expected/100))<1.1,'时间竖线位于对应百分比');assert(m.height>r.height&&m.y<r.y&&m.y+m.height>r.y+r.height,'竖线超出进度条上下边界');assert.equal(await track.evaluate(e=>getComputedStyle(e).overflowY),'visible');
  const {actual,target,gap}=totals[mode];
  const expectedAmounts=[actual,target,gap].map((cents,index)=>{
   if(!Number.isFinite(cents))return '--';
   const inWan=Math.abs(cents)>1000000;
   const amount=(cents/(inWan?1000000:100)).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
   return (index===2&&cents>0?'+':'')+amount+(inWan?'万元':'元');
  });
  assert.deepEqual(await card.locator('.cc-card-metrics strong').allTextContents(),expectedAmounts);
 }
}
