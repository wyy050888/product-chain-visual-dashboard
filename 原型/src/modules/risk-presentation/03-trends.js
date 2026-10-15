// 近7日固定以当前结束日回溯；按统一逐日基数计算，不生成另一套随机趋势。
const rpTrendMetrics={gsv:'GSV',margin:'利润率',return:'总退',received:'已收退'};
function rpTrendOptions(k){return k===0?{gsv:'GSV',netSales:'去退后销量',margin:'利润率',return:'总退',received:'已收退',violations:'违规次数',contact:'进线率',bad:'差评率'}:k===2?{gsv:'GSV',netSales:'去退后销量',margin:'净利润率',return:'总退',received:'已收退'}:[3,4,6].includes(k)?{gsv:'GSV',netSales:'去退后销量',margin:'利润率',return:'总退',received:'已收退'}:rpTrendMetrics}
function rpTrendHeader(metric,k){
 return `<label class="rp-trend-heading"><span>近7日</span><select data-rp-trend aria-label="近7日趋势指标">${Object.entries(rpTrendOptions(k)).map(([key,name])=>`<option value="${key}" ${metric===key?'selected':''}>${name}</option>`).join('')}</select><span>趋势</span></label>`;
}
function rpTrendPoints(k,record,qualityOnly=true){
 const end=riskRange().end,start=shiftDate(end,-6);
 if(k===1)return upWithRange({start,end},()=>riskShopPeriod(record).points.map(d=>({date:d.date,gsv:d.gsv*1000000,margin:null,return:null,received:null})));
 const platform=k===0?record.platform:k===6?record.channel:record.metricPlatform||(rfState.listPlatforms[k]||'all');
 const source=record.rows||[record],identities=[...new Map(source.map(r=>upIdentity(r)).filter(Boolean).map(p=>[p.spuId,p])).values()];
 if(!identities.length)return [];
 const series=identities.map(p=>upSummary(p,start,end,platform).points);
 const events=k===0?rpQualityEvents(record,start,end,qualityOnly):[];
 return series[0].map((point,i)=>{
  const totals={sales:0,returned:0,received:0,gsvCents:0,profitCents:0,contacts:0,reviews:0,bad:0};
  for(const rows of series)for(const key of Object.keys(totals))totals[key]+=rows[i][key];
  return {contact:totals.sales?totals.contacts/totals.sales*100:null,bad:totals.reviews?totals.bad/totals.reviews*100:null,date:point.date,gsv:totals.gsvCents,netSales:totals.sales-totals.returned,violations:events.filter(e=>e.date===point.date).length,margin:totals.gsvCents?totals.profitCents/totals.gsvCents*100-(k===2?10:0):null,return:totals.sales?totals.returned/totals.sales*100:null,received:totals.sales?totals.received/totals.sales*100:null};
 });
}
function rpTrendValue(value,metric,k){return value===null?'暂无数据':metric==='gsv'?([0,2,3,4,6].includes(k)?rpQualityMoney(value/100):upMoney(value)):metric==='netSales'?([0,2,3,4,6].includes(k)?fmt(value):rpCount(value)):metric==='violations'?(k===0?fmt(value):fmt(value)+'次'):upPercent(value)}
function rpTrendChart(k,r,metric,qualityOnly=true){
 const points=rpTrendPoints(k,r,qualityOnly),values=points.map(d=>d[metric]).filter(Number.isFinite);
 if(!values.length)return '<span class="rp-trend-empty">暂无数据</span>';
 const low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1,y=v=>43-(v-low)/span*38,zero=y(0),name=rpTrendOptions(k)[metric];
 const bars=points.map((d,i)=>{
  const v=d[metric],x=4+i*17,title=d.date+' · '+name+' '+rpTrendValue(v,metric,k);
  const height=v===null?0:Math.max(1,Math.abs(y(v)-zero)),top=v===null?zero:v<0?zero:zero-height;
  return `<g><rect x="${x}" y="3" width="15" height="41" fill="#f0f2f5"/>${v===null?'':`<rect class="rp-trend-bar" x="${x}" y="${top.toFixed(2)}" width="15" height="${height.toFixed(2)}" fill="${i===6?'#539df6':'#98c6fc'}"/>`}<rect tabindex="0" role="img" aria-label="${esc(title)}" data-rp-trend-point data-trend-date="${d.date}" data-trend-metric="${metric}" data-trend-name="${esc(name)}" data-trend-value="${esc(rpTrendValue(v,metric,k))}" x="${x}" y="0" width="15" height="48" fill="transparent"></rect></g>`;
 }).join('');
 return `<svg class="rp-mini-trend" viewBox="0 0 126 48" role="img" aria-label="${esc(name)}近7日趋势：${points[0].date}至${points.at(-1).date}；各行独立缩放" data-trend-metric="${metric}">${bars}${low<0&&high>0?`<line x1="4" x2="121" y1="${zero}" y2="${zero}" stroke="#bbc9dc"/>`:''}</svg>`;
}
