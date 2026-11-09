// 展示口径只影响左侧分布，沿用同一快照；右侧始终展示货值占比趋势。
let ipStaleDistributionMetric='valueCents';
function ipStaleChartValue(value,metric){return metric==='units'?fmt(value)+'件':fmt(value/1000000,1)+'万元'}
function ipStaleStack(seasons,metric,maximum,total,label){
 return `<div class="ip-stale-stack" role="group" aria-label="${esc(label)}">${seasons.filter(row=>row[metric]>0).map(row=>{
  const value=row[metric],share=total>0?value/total*100:0,hint=`${label}\n${row.label}：${ipStaleChartValue(value,metric)}\n占本组：${fmt(share,1)}%`;
  return `<span class="season-${row.index}" role="img" aria-label="${esc(hint)}" style="width:${maximum>0?value/maximum*100:0}%"></span>`;
 }).join('')}</div>`;
}
// 占比始终使用当前口径的总量，不能将数量占比用于货值。
function ipStaleValueLine(value,total,metric,known=true,attribute=''){
 const share=known&&total>0?fmt(value/total*100,1)+'%':'';
 return `<div class="ip-stale-season-value" data-ip-stale-line="${metric}"><strong class="ip-stale-share">${share}</strong><span class="ip-stale-amount" ${attribute}>${known?ipStaleChartValue(value,metric):'—'}</span></div>`;
}
function ipStaleDistributionPanel(model){
 const data=model.distribution,metric=ipStaleDistributionMetric,label=metric==='units'?'件数':'货值';
 const controls=`<div class="ip-stale-metric-switch" role="group" aria-label="分布统计口径">${[['valueCents','货值'],['units','件数']].map(([key,name])=>`<button type="button" data-ip-stale-metric="${key}" aria-pressed="${metric===key}">${name}</button>`).join('')}</div>`;
 const seasons=data.seasons.map(row=>`<div><span><i class="season-${row.index}"></i>${esc(row.label)}</span>${ipStaleValueLine(row[metric],data[metric],metric,true,`${metric==='units'?'data-stock-stale-season':'data-stock-stale-season-value'}="${esc(row.label)}"`)}</div>`).join('');
 const rows=data.bands.map((row,index)=>({...row,key:index}));
 if(data.other.units>0||data.other.valueCents>0)rows.push({...data.other,label:'不足60天',key:'other'});
 if(data.unknown.units>0||data.unknown.valueCents>0)rows.push({...data.unknown,label:'未分档',key:'unknown'});
 const cells=rows.map(row=>{
  const pending=row.key==='unknown';
  const known=(value,metric,season=null)=>value>0||pending||data.unknown[metric]===0||season&&data.seasons.find(item=>item.label===season.label)[metric]===0;
  const values=row.seasons.map(season=>{
   return `<div role="cell" class="ip-stale-age-cell" data-ip-age-season="${esc(season.label)}"><span class="ip-stale-cell-season">${esc(season.label)}</span>${ipStaleValueLine(season[metric],data[metric],metric,known(season[metric],metric,season),`data-ip-age-metric="${metric}"`)}</div>`;
  }).join('');
  const totals=ipStaleValueLine(row[metric],data[metric],metric,known(row[metric],metric));
  return `<div role="row" class="ip-stale-age-row ${pending?'is-unclassified':''}" data-ip-stale-band="${row.key}"><span role="rowheader" class="ip-stale-age-label">${row.label}</span>${values}<div role="cell" class="ip-stale-age-total">${totals}</div></div>`;
 }).join('');
 const headings=`<div class="ip-stale-age-columns" role="row"><span role="columnheader">库龄</span>${data.seasons.map(row=>`<span role="columnheader"><i class="season-${row.index}"></i>${esc(row.label)}</span>`).join('')}<span role="columnheader">合计占比</span></div>`;
 const total=metric==='units'?data.totalUnits:data.totalValueCents,ratio=total>0?fmt(data[metric]/total*100,1):'—';
 const totals=`<div><span data-metric-help-disabled>${metric==='units'?'呆滞库存':'呆滞货值'}</span><strong data-ip-stale-total="${metric}">${metric==='units'?fmt(data.units):fmt(data.valueCents/1000000,1)}<small>${metric==='units'?'件':'万元'}</small></strong></div><div><span>呆滞占比</span><strong data-ip-stale-total-share>${ratio}${total>0?'<small>%</small>':''}</strong></div>`;
 const stack=ipStaleStack(data.seasons,metric,data[metric],data[metric],'季品'+label+'分布');
 return `<article class="ip-stale-panel ip-stale-distribution"><header><h3>呆滞库存分布</h3>${controls}</header><div class="ip-stale-distribution-total">${totals}</div><div class="ip-stale-season-distribution"><div class="ip-stale-stacks">${stack}</div><div class="ip-stale-season-summary">${seasons}</div></div><div class="ip-stale-age-heading"><h4>库龄分布</h4></div><div class="ip-stale-age-table" role="table" aria-label="库龄季品${label}分布">${headings}${cells}</div></article>`;
}

let ipStaleAnalysisObserver=null,ipStaleAnalysisWidth=0,ipStaleAnalysisHeight=0;
function ipRenderStaleAnalysis(){
 const host=$('#inventory-stale-analysis');if(!host)return;
 const model=ipStaleAnalysisModel();
 host.innerHTML=ipStaleDistributionPanel(model)+ipStaleTrendPanel(model)+(ipSnapshotSaveFailed?'<p class="ip-stale-save-error" role="status">快照保存失败，请释放浏览器存储空间后重试。</p>':'');
 if(!host.dataset.ipStaleMetricBound){host.dataset.ipStaleMetricBound='true';host.addEventListener('click',event=>{
  const button=event.target.closest('[data-ip-stale-metric]'),next=button?.dataset.ipStaleMetric;if(!['valueCents','units'].includes(next)||next===ipStaleDistributionMetric)return;
  ipStaleDistributionMetric=next;host.querySelector('.ip-stale-distribution').outerHTML=ipStaleDistributionPanel(ipStaleAnalysisModel());host.querySelector('[data-ip-stale-metric="'+next+'"]').focus({preventScroll:true});
 })}
 const plot=host.querySelector('[data-ip-stale-trend-plot]');plot.innerHTML=ipStaleTrendSvg(model.trend,plot.clientWidth,plot.clientHeight);
 if(!ipStaleAnalysisObserver){ipStaleAnalysisObserver=new ResizeObserver(entries=>{
  const {width,height}=entries[0].contentRect;if(Math.abs(width-ipStaleAnalysisWidth)<2&&Math.abs(height-ipStaleAnalysisHeight)<2)return;ipStaleAnalysisWidth=width;ipStaleAnalysisHeight=height;
  const target=host.querySelector('[data-ip-stale-trend-plot]');if(target)target.innerHTML=ipStaleTrendSvg(ipStaleAnalysisModel().trend,target.clientWidth,target.clientHeight);
 });ipStaleAnalysisObserver.observe(host)}
}
