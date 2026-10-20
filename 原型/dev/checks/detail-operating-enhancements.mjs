import {verifyGradeTrend} from './detail-grade-trend.mjs';
import assert from 'node:assert/strict';
export async function operatingEnhancements(page){
 const panel=page.locator('[data-up-panel="operating"]'),table=panel.locator('.up-platform-performance table');
 const rows=()=>table.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)));
 const baseline=await rows();assert.equal(await panel.locator('[data-up-channel-sort]').count(),9);
 const numeric=text=>text==='—'?null:parseFloat(text.replaceAll(',',''))*(text.includes('w')?10000:1);
 for(const [index,key] of ['platform','gsvCents','sales','netSales','expenseCents','feeRate','profitRate','returnRate','receivedRate'].entries()){
  for(let n=0;n<3;n++){
   const button=panel.locator('[data-up-channel-sort="'+key+'"]');await button.click();const direction=await button.getAttribute('data-direction');if(!direction)continue;
   const data=await rows(),values=data.map(row=>index?numeric(row[index]):row[0]);
   assert.deepEqual(await panel.locator('[data-up-contribution-channel]').evaluateAll(es=>es.map(e=>e.dataset.upContributionChannel)),data.map(row=>row[0]),'排序同步右侧渠道贡献顺序');
   if(!index)assert.deepEqual(values,[...values].sort((a,b)=>(direction==='asc'?1:-1)*a.localeCompare(b,'zh-CN')));
   else{const valid=values.filter(v=>v!==null);assert(values.slice(valid.length).every(v=>v===null));assert(valid.every((v,i)=>!i||(direction==='asc'?valid[i-1]<=v:valid[i-1]>=v)),'排序 '+key)}
  }
 }
 await panel.locator('[data-up-channel-sort="gsvCents"]').click();assert.deepEqual(await rows(),baseline,'恢复默认GSV排序');
 await verifyGradeTrend(page);
 for(const width of [1920,1100,390]){
  await page.setViewportSize({width,height:1080});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'正文溢出 '+width);
  const boxes=await panel.evaluate(panel=>{const table=panel.querySelector('.up-platform-performance table'),host=table.parentElement;return{table:table.getBoundingClientRect().right,host:host.getBoundingClientRect().right,scroll:host.scrollWidth>host.clientWidth+1,borders:[...panel.querySelectorAll('.up-metric,.up-attainment,.up-sales-trend,.up-channel-contribution,.up-platform-performance')].map(e=>getComputedStyle(e).borderLeftWidth)}});
  assert(boxes.borders.every(value=>value==='0px'));if(width===1920)assert(Math.abs(boxes.table-boxes.host)<2);else if(width===390)assert(boxes.scroll);
 }
 await page.setViewportSize({width:1920,height:1080});
}
