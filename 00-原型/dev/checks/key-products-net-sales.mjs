import assert from 'node:assert/strict';
export async function verifyKeyProductNetSales(page){
 const snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot());
 const root=page.locator('#matrix'),header=root.locator('[data-kpm-sort="units"]');
 assert.match(await header.innerText(),/^销量/);
 const verify=async()=>{
  const state=await snapshot();
  for(const product of state.rows){
   assert.equal(product.facts.netSales,product.facts.sales-product.facts.returned);
   assert.equal(product.previous.netSales,product.previous.sales-product.previous.returned);
   assert(Number.isInteger(product.facts.netSales)&&product.facts.netSales>=0);
  }
  const actual=await root.locator('#matrixtable tbody tr').evaluateAll(rows=>rows.map(row=>{
   const cell=row.querySelector('[data-kpm-metric="units"]');return {id:row.querySelector('[data-kpm-detail]').dataset.kpmDetail,value:cell.querySelector('strong').textContent,comparison:cell.querySelector('em').textContent.replace(/[\s,]/g,'')};
  }));
  for(const row of actual){
   const product=state.rows.find(p=>p.spuId===row.id),now=product.facts.netSales,before=product.previous.netSales;
   const quantity=now>10000?new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false}).format(now/10000)+'w':now.toLocaleString('zh-CN');
   assert.equal(row.value,quantity,'主表显示去退后销量，超万缩写为w');
   const change=before>0?(now-before)/before*100:now===before?0:null;
   const rounded=Math.round(Math.abs(change)*10)/10;
   const expected=change===null?'环比--':rounded===0?'环比持平':'环比'+(change>0?'↑':'↓')+rounded.toFixed(1)+'%';
   assert.equal(row.comparison,expected,'环比本期/上期均使用去退后销量');
  }
  return state;
 };
 await verify();
 for(const direction of ['desc','asc']){
  await header.click();const state=await verify();assert.equal(state.sort.direction,direction);
  const values=state.visible.map(p=>p.facts.netSales);assert(values.every((value,i)=>!i||(direction==='desc'?values[i-1]>=value:values[i-1]<=value)),'全量按去退后销量排序');
 }
 await header.click();assert.equal((await snapshot()).sort.key,'sales');
}
