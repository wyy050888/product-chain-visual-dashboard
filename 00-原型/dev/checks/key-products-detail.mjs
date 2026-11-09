import assert from 'node:assert/strict';
export async function verifyKeyProductDetail(page){
 const root=page.locator('#matrix'),snapshot=await page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const headers=await root.locator('#matrixtable th').allTextContents();
 assert.deepEqual(headers.map(t=>t.replace(/[↑↓↕]/g,'').replaceAll('上市','上线').trim()),['SPU信息','等级变动','GSV','销量','利润率','总退','已收退','我司可售库存','总库存','上线时长','操作']);
 assert.equal(await root.locator('.kpm-list-head').count(),0,'移除右侧明细标题');
 assert.deepEqual(await root.locator('[data-kpm-filter]').evaluateAll(es=>es.map(e=>e.dataset.kpmFilter)),['brand']);
 const cells=await root.locator('#matrixtable tbody tr').evaluateAll(rows=>rows.map(row=>({
  id:row.querySelector('[data-kpm-detail]').dataset.kpmDetail,grade:row.querySelector('.kpm-grade').textContent,
  identity:row.querySelector('.prodname').textContent,thumb:row.querySelector('.prodname>.risk-thumb').getBoundingClientRect().width,
  metrics:Object.fromEntries([...row.querySelectorAll('[data-kpm-metric]')].map(e=>[e.dataset.kpmMetric,{value:e.querySelector('strong').textContent,aux:e.querySelector('em')?.textContent||''}])),
  duration:row.cells[9].textContent,operation:row.cells[10].textContent
 })));
 const money=cents=>{const value=cents/100;return (Math.abs(value)>10000?value/10000:value).toFixed(1)+(Math.abs(value)>10000?'w':'元')};
 const compare=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return '环比 --';if(a===b)return '环比 持平';if(b===0)return '环比 --';const change=(a-b)/Math.abs(b)*100;return Math.round(Math.abs(change)*10)===0?'环比 持平':'环比 '+(change>0?'↑ ':'↓ ')+Math.abs(change).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'};
 for(const row of cells){
  const p=snapshot.visible.find(p=>p.spuId===row.id),m=row.metrics;
  assert.equal(row.grade,p.level||'—');assert.equal(row.thumb,56,'主表使用统一56px产品缩略图');
  assert(row.identity.includes(p.name)&&row.identity.includes(p.spuCode));
  assert.equal(row.duration,Number.isFinite(p.days)?p.days.toLocaleString('en-US')+'天':'—');
  assert.equal(p.days,Math.max(0,Math.round((Date.parse(snapshot.range.end)-Date.parse(p.actualLaunch))/86400000)+1),'上线当天计一天，随统计截止日计算');assert.equal(row.operation,'查看');
  assert.equal(m.gsv.value,money(p.facts.gsvCents));assert.equal(m.units.value,p.facts.netSales.toLocaleString('en-US'));
  assert.equal(m.profit.value,p.facts.profitRate.toFixed(1)+'%');
  for(const [key,current,previous] of [['gsv',p.facts.gsvCents,p.previous.gsvCents],['units',p.facts.netSales,p.previous.netSales],['profit',p.facts.profitRate,p.previous.profitRate]])assert.equal(m[key].aux,compare(current,previous));
  const unreceived=f=>f.sales>0&&Number.isFinite(f.received)?(f.returned-f.received)/f.sales*100:null;
  for(const [key,current,previous] of [['returns',p.facts.returnRate,p.previous.returnRate],['received',p.facts.receivedRate,p.previous.receivedRate],['unreceived',unreceived(p.facts),unreceived(p.previous)]])assert.equal(m[key].aux,compare(current,previous),'全平台退货率环比 '+key);
  assert.equal(m.warehouse.value,Number.isFinite(p.stock?.warehouse)?p.stock.warehouse.toLocaleString('en-US'):'—');
  assert.equal(m.warehouse.aux,'货值 '+(Number.isFinite(p.stock?.warehouseValueCents)?money(p.stock.warehouseValueCents):'—'));
  assert.equal(m.total.aux,'总可售天数 '+(Number.isFinite(p.stock?.totalCoverage15)?p.stock.totalCoverage15.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'天':'—'));
 }
 assert.equal(await root.locator('#matrixtable td:last-child [data-kpm-history]').count(),0,'操作列只保留产品查看');
 await verifyKeyProductViewport(page);
 await verifyLaunchDurationSort(page);
}

async function verifyKeyProductViewport(page){
 const host=page.locator('#matrix #matrixtable');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 const geometry=()=>host.evaluate(e=>{
  const rows=[...e.querySelectorAll('tbody tr')],partial=rows[6]?.getBoundingClientRect(),bottom=e.getBoundingClientRect().top+e.clientTop+e.clientHeight;
  return {count:rows.length,overflow:e.scrollHeight-e.clientHeight,ratio:partial?(bottom-partial.top)/partial.height:null};
 });
 const assertHalf=async label=>{const box=await geometry();assert(box.overflow>0&&Math.abs(box.ratio-.5)<.03,'显示六行半且可内部滚动 '+label)};
 for(const width of [1920,1440,900,390]){
  await page.setViewportSize({width,height:1080});await settle();await host.evaluate(e=>e.scrollTop=0);
  assert.equal((await geometry()).count,10,'每页仍10条');await assertHalf(width);
  const headerTop=await host.locator('th').first().evaluate(e=>e.getBoundingClientRect().top);
  await host.evaluate(e=>e.scrollTop=150);await settle();
  assert(Math.abs(await host.locator('th').first().evaluate(e=>e.getBoundingClientRect().top)-headerTop)<1,'内部滚动时表头固定 '+width);
 }
 await host.evaluate(e=>{e.scrollTop=0;e.savedViewportRows=[...e.querySelectorAll('tbody tr')];e.savedViewportRows.slice(6).forEach(row=>row.remove())});await settle();
 try{
  let box=await geometry();assert.equal(box.count,6);assert(box.overflow<=1,'不足七条自然收缩');
  await host.evaluate(e=>e.querySelector('tbody').append(e.savedViewportRows[6]));await settle();await assertHalf('七条数据');
  await host.evaluate(e=>{const body=e.querySelector('tbody');e.savedViewportRows.slice(7).forEach(row=>body.append(row));body.append(e.savedViewportRows[9].cloneNode(true))});await settle();
  box=await geometry();assert.equal(box.count,11);await assertHalf('超过十条数据');
 }finally{
  await host.evaluate(e=>{e.querySelector('tbody').replaceChildren(...e.savedViewportRows);delete e.savedViewportRows;e.scrollTop=0});
  await page.setViewportSize({width:1920,height:1080});await settle();
 }
}

async function verifyLaunchDurationSort(page){
 const root=page.locator('#matrix'),button=root.locator('[data-kpm-sort="days"]');
 const snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const original=await snapshot();
 for(const direction of ['desc','asc']){
  await button.click();const data=await snapshot();
  assert.deepEqual(data.sort,{key:'days',direction});assert.equal(data.page,1);
  assert.equal(await button.locator('..').getAttribute('aria-sort'),direction==='asc'?'ascending':'descending');
  const expected=[...original.visible].sort((a,b)=>direction==='asc'?a.days-b.days:b.days-a.days);
  assert.deepEqual(data.visible.map(p=>p.spuId),expected.map(p=>p.spuId),'全量按原始天数排序，同值稳定');
  const shown=await root.locator('#matrixtable [data-kpm-detail]').evaluateAll(es=>es.map(e=>e.dataset.kpmDetail));
  assert.deepEqual(shown,expected.slice(0,10).map(p=>p.spuId),'先排序全部数据再分页');
 }
 await button.click();const restored=await snapshot();
 assert.deepEqual(restored.sort,{key:'sales',direction:'desc'},'第三次点击恢复GSV降序');
 assert.deepEqual(restored.visible.map(p=>p.spuId),original.visible.map(p=>p.spuId),'恢复默认行顺序');
}

export async function verifyKeyProductReturnComparisons(page){
 const snapshot=await page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const cells=await page.locator('#matrix #matrixtable tbody tr').evaluateAll(rows=>rows.map(row=>({id:row.querySelector('[data-kpm-detail]').dataset.kpmDetail,metrics:Object.fromEntries([...row.querySelectorAll('[data-kpm-metric]')].map(e=>[e.dataset.kpmMetric,{value:e.querySelector('strong').textContent,aux:e.querySelector('em')?.textContent||''}]))})));
 assert(cells.length>0);
 const colors=await page.locator('#matrix #matrixtable tbody tr').evaluateAll(rows=>rows.map(row=>{const color=key=>getComputedStyle(row.querySelector('[data-kpm-metric="'+key+'"] strong')).color;return {normal:color('units'),total:color('returns'),received:color('received')}}));
 assert(colors.every(row=>row.total===row.normal&&row.received===row.normal),'汇总退货主值使用普通数据色');
 const rate=f=>f.sales>0&&Number.isFinite(f.received)?(f.returned-f.received)/f.sales*100:null;
 const compare=(now,before)=>{if(!Number.isFinite(now)||!Number.isFinite(before)||before===0&&now!==0)return '环比 --';const raw=now===before?0:(now-before)/before*100,rounded=Math.round(Math.abs(raw)*10)/10;return rounded===0?'环比 持平':'环比 '+(raw>0?'↑ ':'↓ ')+rounded.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'};
 const percent=value=>Number.isFinite(value)?value.toFixed(1)+'%':'—';
 for(const row of cells){
  const product=snapshot.visible.find(p=>p.spuId===row.id),c=product.facts,b=product.previous;
  for(const [key,now,prior] of [['returns',c.returnRate,b.returnRate],['received',c.receivedRate,b.receivedRate],['unreceived',rate(c),rate(b)]]){
   assert.equal(row.metrics[key].value,percent(now),key+' 主值保持原率');
   assert.equal(row.metrics[key].aux,compare(now,prior),key+' 与紧邻等长上期退货率比较');
  }
 }
}
