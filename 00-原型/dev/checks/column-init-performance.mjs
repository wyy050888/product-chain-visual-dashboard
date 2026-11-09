import assert from 'node:assert/strict';

// 用实际浏览器布局次数拦截逐列表头“读布局→写DOM”的性能回退，避免依赖机器速度。
export async function columnInitPerformance(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await settle();
 const client=await page.context().newCDPSession(page);await client.send('Performance.enable');
 const layouts=async()=>{const {metrics}=await client.send('Performance.getMetrics');return metrics.find(metric=>metric.name==='LayoutCount').value};
 try{
  const before=await layouts();
  await page.evaluate(()=>{
   const host=document.createElement('div');host.id='column-performance-fixture';host.style='position:absolute;top:50000px;left:0;width:1000px';
   host.innerHTML=Array.from({length:16},(_,table)=>'<table style="width:800px"><thead><tr>'+Array.from({length:10},(_,column)=>'<th>字段'+table+'-'+column+'</th>').join('')+'</tr></thead><tbody><tr>'+Array.from({length:10},()=>'<td>内容</td>').join('')+'</tr></tbody></table>').join('');
   document.body.append(host);
  });
  await settle();
  assert.equal(await page.locator('#column-performance-fixture [data-ui-column-handle]').count(),160);
  const count=await layouts()-before;
  assert(count<=10,'批量列宽初始化不能逐列触发布局，实际布局次数：'+count);
  console.log('16张动态表格/160列表头初始化布局次数：'+count);
 }finally{await page.locator('#column-performance-fixture').evaluate(node=>node.remove()).catch(()=>{});await client.detach()}
}
