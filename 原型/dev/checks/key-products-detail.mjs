import assert from 'node:assert/strict';
export async function verifyKeyProductDetail(page){
 const root=page.locator('#matrix'),snapshot=await page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const headers=await root.locator('#matrixtable th').allTextContents();
 assert.deepEqual(headers.map(t=>t.replace(/[↑↓↕]/g,'').trim()),['SPU信息','产品分级','等级变动','GSV','销量','利润率','总退','已收退','我司可售库存','总库存','类目','季品','操作']);
 assert.equal(await root.locator('.kpm-list-head').count(),0,'移除右侧明细标题');
 assert.deepEqual(await root.locator('[data-kpm-filter]').evaluateAll(es=>es.map(e=>e.dataset.kpmFilter)),['brand','category','season']);
 const cells=await root.locator('#matrixtable tbody tr').evaluateAll(rows=>rows.map(row=>({
  id:row.querySelector('[data-kpm-detail]').dataset.kpmDetail,grade:row.cells[1].textContent,
  identity:row.querySelector('.prodname').textContent,thumb:row.querySelector('.prodname>.risk-thumb').getBoundingClientRect().width,
  metrics:Object.fromEntries([...row.querySelectorAll('[data-kpm-metric]')].map(e=>[e.dataset.kpmMetric,{value:e.querySelector('strong').textContent,aux:e.querySelector('em')?.textContent||''}])),
  category:row.cells[10].textContent,season:row.cells[11].textContent,operation:row.cells[12].textContent
 })));
 const money=cents=>{const value=cents/100;return (Math.abs(value)>10000?value/10000:value).toFixed(1)+(Math.abs(value)>10000?'w':'元')};
 const compare=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return '环比 --';if(a===b)return '环比 持平';if(b===0)return '环比 --';const change=(a-b)/Math.abs(b)*100;return Math.round(Math.abs(change)*10)===0?'环比 持平':'环比 '+(change>0?'↑ ':'↓ ')+Math.abs(change).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'};
 for(const row of cells){
  const p=snapshot.visible.find(p=>p.spuId===row.id),m=row.metrics;
  assert.equal(row.grade,p.level||'—');assert.equal(row.thumb,56,'首列与新品保持56px产品图');
  assert(row.identity.includes(p.name)&&row.identity.includes(p.spuCode));
  assert.equal(row.category,p.category);assert.equal(row.season,p.season);assert.equal(row.operation,'查看');
  assert.equal(m.gsv.value,money(p.facts.gsvCents));assert.equal(m.units.value,p.facts.sales.toLocaleString('en-US'));
  assert.equal(m.profit.value,p.facts.profitRate.toFixed(1)+'%');
  for(const [key,current,previous] of [['gsv',p.facts.gsvCents,p.previous.gsvCents],['units',p.facts.sales,p.previous.sales],['profit',p.facts.profitRate,p.previous.profitRate]])assert.equal(m[key].aux,compare(current,previous));
  for(const [key,actual,target] of [['returns',p.facts.returnRate,p.returnTarget],['received',p.facts.receivedRate,8]]){
   const gap=actual-target;assert.equal(m[key].aux,'偏差 '+(gap>1e-10?'+':'')+(Math.abs(gap)<1e-10?0:gap).toFixed(1)+'%');
  }
  assert.equal(m.warehouse.value,Number.isFinite(p.stock?.warehouse)?p.stock.warehouse.toLocaleString('en-US'):'—');
  assert.equal(m.warehouse.aux,'我司可售货值 '+(Number.isFinite(p.stock?.warehouseValueCents)?money(p.stock.warehouseValueCents):'—'));
  assert.equal(m.total.aux,'总可售天数 '+(Number.isFinite(p.stock?.totalCoverage15)?p.stock.totalCoverage15.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'天':'—'));
 }
 assert.equal(await root.locator('#matrixtable td:last-child [data-kpm-history]').count(),0,'操作列只保留产品查看');
 await verifyKeyProductViewport(page);
}

async function verifyKeyProductViewport(page){
 const host=page.locator('#matrix #matrixtable');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 const geometry=()=>host.evaluate(e=>{const rows=[...e.querySelectorAll('tbody tr')],visibleBottom=e.getBoundingClientRect().top+e.clientTop+e.clientHeight;return {count:rows.length,overflow:e.scrollHeight-e.clientHeight,lastBottom:rows.at(-1).getBoundingClientRect().bottom,visibleBottom}});
 for(const width of [1920,1440,390]){
  await page.setViewportSize({width,height:1080});await settle();
  let box=await geometry();assert.equal(box.count,10);assert(box.overflow<=1&&box.lastBottom<=box.visibleBottom+1,'十条完整显示且无内部垂直滚动 '+width);
 }
 await host.evaluate(e=>{e.savedTenth=e.querySelector('tbody tr:last-child');e.savedTenth.remove()});await settle();
 let box=await geometry();assert.equal(box.count,9);assert(box.overflow<=1,'不足十条不出现垂直滚动');
 await host.evaluate(e=>{const body=e.querySelector('tbody');body.append(e.savedTenth);e.extraRow=e.savedTenth.cloneNode(true);body.append(e.extraRow)});await settle();
 box=await geometry();assert.equal(box.count,11);assert(box.overflow>0&&box.lastBottom>box.visibleBottom,'超过十条才内部垂直滚动');
 assert(await host.evaluate(e=>e.querySelectorAll('tbody tr')[9].getBoundingClientRect().bottom<=e.getBoundingClientRect().top+e.clientTop+e.clientHeight+1),'超出时仍完整展示前十条');
 await host.evaluate(e=>{e.extraRow.remove();delete e.extraRow;delete e.savedTenth});await page.setViewportSize({width:1920,height:1080});await settle();
}
