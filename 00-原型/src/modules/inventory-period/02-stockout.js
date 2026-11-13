// 原型的逐日仓内库存样例；月末库存及缺货预警榜无法还原实际断货日期。
const ipStockoutDemoSnapshots=[
 ['SPU-SOURCE-001','2026-08-18',0],
 ['SPU-SOURCE-001','2026-10-12',0],
 ['SPU-SOURCE-001','2026-11-03',0],
 ['SPU-SOURCE-001','2026-11-07',0],
 ['SPU-SOURCE-002','2026-10-20',0],
 ['SPU-SOURCE-002','2026-11-05',0],
 ['SPU-SOURCE-015','2026-11-06',0],
 ['SPU-SOURCE-015','2026-11-07',12]
].map(([spuId,date,warehouse])=>({spuId,date,warehouse}));

function ipStockoutModel(records,range,history=ipStockoutDemoSnapshots){
 const products=new Map(records.map(record=>[record.spuId,upIdentity(record)])),datesByProduct=new Map();
 const snapshots=[...history,...records.map(({spuId,warehouse})=>({spuId,warehouse,date:DATA_CUTOFF}))];
 const dated=new Map(snapshots.map(row=>[row.spuId+'|'+row.date,row]));
 for(const {spuId,date,warehouse} of dated.values()){
  const identity=products.get(spuId);
  if(!identity||warehouse!==0||!ipSnapshotDate(date)||date<range.start||date>range.cutoff)continue;
  const product=upProduct(identity);
  if(product.actualLaunch>date||rpShortageExcluded(product)||['下市','下市品','已下市','已下架'].includes(product.state))continue;
  if(!(upSellableStock(identity,warehouse,date).dailyNet15>0)||kpmGradeAssessment(identity,date).level==='C')continue;
  if(!datesByProduct.has(spuId))datesByProduct.set(spuId,[]);
  datesByProduct.get(spuId).push(date);
 }
 const rows=Array.from(datesByProduct,([spuId,dates])=>{
  const {name,spuCode}=products.get(spuId);
  return {spuId,name,spuCode,dates:dates.sort().reverse(),count:dates.length};
 }).sort((a,b)=>b.count-a.count||b.dates[0].localeCompare(a.dates[0])||a.spuId.localeCompare(b.spuId));
 return {rows,count:targetSum(rows.map(row=>row.count)),start:range.start,end:range.cutoff};
}

function ipStockoutCard({count}){
 const value=`<strong data-stock-stockout="${count}">${fmt(count)}<span class="unit"> 次</span></strong>`;
 const quantity=count>0?`<button type="button" class="link ip-stockout-entry" data-ip-stockout-open aria-haspopup="dialog" aria-label="爆款断货 ${count} 次，查看明细">${value}<span aria-hidden="true">›</span></button>`:value;
 return ipOverviewCard({key:'stockout',title:'爆款断货次数',help:ipOverviewHelp('stockout'),quantity,className:'stock-summary-single'});
}

function ipOpenStockout(model,period){
 openModal('爆款断货产品明细',`<article class="ip-stockout-drawer">
  <p class="nsp-unsold-notice">断货明细为演示数据。同一产品同一天计一次。</p>
  <div class="ip-stockout-toolbar nsp-unsold-toolbar">
   <input type="search" aria-label="搜索产品名称或SPU编码" placeholder="搜索产品名称 / SPU编码">
   <div data-ip-stockout-period></div>
  </div>
  <div class="tablewrap nsp-unsold-table ip-stockout-table"></div>
  <div data-ip-stockout-pager></div>
 </article>`,true);
 const root=$('#dialogbody .ip-stockout-drawer'),search=root.querySelector('input');
 const periodHost=root.querySelector('[data-ip-stockout-period]'),host=root.querySelector('.ip-stockout-table'),pager=root.querySelector('[data-ip-stockout-pager]');
 let page=1,rows=[];
 const render=()=>{
  const query=search.value.trim().toLocaleLowerCase();
  const visible=rows.filter(row=>[row.name,row.spuCode].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
  const size=listPageSize('ip-stockout'),offset=(page-1)*size;
  host.innerHTML=table(['产品名称','断货次数','断货日期'],visible.slice(offset,offset+size).map(row=>[
   `<div class="prodname">${riskThumbnail(row.name)}<div><strong>${esc(row.name)}</strong><small>SPU码：${esc(row.spuCode||'—')}</small></div></div>`,
   fmt(row.count)+' 次',
   '<div class="ip-stockout-dates">'+row.dates.map(date=>'<time datetime="'+esc(date)+'">'+esc(date)+'</time>').join('')+'</div>'
  ]));
  if(!visible.length)host.querySelector('tbody').innerHTML='<tr><td class="empty" colspan="3">当前筛选下暂无断货产品</td></tr>';
  mountListPager(pager,visible.length,page,next=>{page=next;render()},'ip-stockout');
 };
 root.ipUpdateStockout=(next,nextPeriod)=>{
  rows=next.rows;page=1;
  $('#dialogsub').textContent=next.start<=next.end?`${next.start} — ${next.end} · ${fmt(next.count)} 次`:'当前期间暂无数据';
  periodHost.innerHTML=ipMetricPeriodMarkup(nextPeriod,{showScope:false});
  ipMountMetricPeriod(periodHost,nextPeriod,ipChangeMetricPeriod);
  render();
 };
 search.oninput=()=>{page=1;render()};
 root.ipUpdateStockout(model,period);
}

function ipRefreshStockoutDrawer(model,period){
 if(!$('#overlay').hidden)$('#dialogbody .ip-stockout-drawer')?.ipUpdateStockout?.(model,period);
}
