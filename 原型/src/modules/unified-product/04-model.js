// 查询模型不依赖页面当前榜单筛选；跨入口只传 SPU、范围、平台和默认标签。
const upTabs=[{key:'operating',label:'业绩表现'},{key:'quality',label:'品质退货'},
  {key:'stock',label:'产品库存'},{key:'handling',label:'风险待办'}];
// 日筛选的达成锚定结束日所在月：实际累计至结束日，目标取完整月份。
// 左侧经营指标和趋势仍使用原筛选范围；月/季/年延续各自口径。
function upAttainmentModel(p,state,current) {
  if(state.period?.mode!=='day')return {actual:current,targets:current,prefix:periodShortText(state.period),progress:msProgress(state.period)};
  const start=state.end.slice(0,7)+'-01';
  const monthEnd=new Date(Date.UTC(+state.end.slice(0,4),+state.end.slice(5,7),0)).toISOString().slice(0,10);
  return {actual:upSummary(p,start,state.end,state.platform),
    targets:upSummary(p,start,monthEnd,state.platform),prefix:Number(state.end.slice(5,7))+'月',
    progress:(aiFlowDayDiff(start,state.end)+1)/(aiFlowDayDiff(start,monthEnd)+1)*100};
}
function upDetailModel(state) {
  const p=upSpus.get(state.spuId),product=upProduct(p);
  const current=upSummary(p,state.start,state.end,state.platform),days=aiFlowDayDiff(state.start,state.end)+1;
  const previousEnd=shiftDate(state.start,-1),previousStart=shiftDate(state.start,-days);
  const previous=upSummary(p,previousStart,previousEnd,state.platform);
  const selected=upChannels(state.platform);
  const quality=selected.map(platform=>qrObservation(product,platform,state.start,state.end));
  return upWithRange(state,()=>{
    const {stock,highStock,stockSummary,stockEnd}=pfCompanyStockModel(state);
    const company=upSummary(p,state.start,state.end);
    const platformRows=qrPlatforms.map(platform=>upSummary(p,state.start,state.end,platform));
    const signals=[];
    for(const row of quality) for(const m of qfMetrics(row)) if(m.hit) signals.push({kind:'品质',platform:row.platform,name:m.name,value:m.value,rule:m.rule});
    for(const row of selected.map(platform=>upSummary(p,state.start,state.end,platform))) {
      const prev=upSummary(p,previousStart,previousEnd,row.platform);
      const causes=pfReturnCauses(row,prev);
      if(causes.length)signals.push({kind:'退货恶化',platform:row.platform,name:causes.join('、'),value:upPercent(row.returnRate),rule:'本期与紧邻等长上期相比，总退增长值＞3个百分点或已收退增长值＞2个百分点入榜；等于阈值不触发，缺失比率不判定。'});
    }
    const net=upNetEstimate(current);if(net.profitCents<0) signals.push({kind:'亏损',platform:state.platform==='all'?'全公司':state.platform,name:'亏损金额',value:pfMoneyYuan((-net.profitCents/1000000)*10000),rule:'毛利率减10个百分点后测算净利为负，按亏损绝对金额排序；原型以GSV为同一收入基数，正式分母待映射。'});
    if(highStock?.reasons.length) for(const reason of highStock.reasons) signals.push({kind:'库存',platform:reason.platforms?.join('、')||'全公司',
      name:reason.label,value:fmt(highStock.totalUnits)+'件',rule:irReasonText(reason)});
    if(stock?.slow) signals.push({kind:'滞销',platform:state.platform==='all'?'全公司':state.platform,name:'可售天数≥60天',value:fmt(stock.slowCoverage,1)+'天',
      rule:'只判断有动销产品：我司可售库存＞0且近15日净销量＞0，可售天数按我司可售库存÷近15日均净销量判断；滞销金额只计算超库龄部分。'});
    return {product,current,attainment:upAttainmentModel(p,state,current),previous,company,quality,stock,highStock,stockSummary,stockEnd,platformRows,signals,days,previousStart,previousEnd};
  });
}
function upPercent(value){return value===null||!Number.isFinite(value)?'—':fmt(value,1)+'%'}
function upMoney(cents,signed=false){return pfMoneyYuan((cents/1000000)*10000,signed)}
function upMetric(name,value,rule='',tone='',key='',note='') {
  return `<div class="up-metric" ${key?`data-up-metric="${key}"`:''}><small ${rule?`data-up-rule="${esc(rule)}"`:'data-up-basic="true"'}>${esc(name)}</small><strong class="${tone}">${esc(value)}</strong>${note?`<em>${esc(note)}</em>`:''}</div>`;
}
function upGrid(items){return `<div class="up-metrics">${items.join('')}</div>`}
function upChart(points,key,label,unit,color='#1677ff') {
  const rows=points.map(d=>({date:d.date,value:d[key]})),valid=rows.filter(d=>d.value!==null);
  if(!valid.length) return '<div class="up-empty">暂无可计算数据</div>';
  const low=Math.min(0,...valid.map(d=>d.value)),high=Math.max(1,...valid.map(d=>d.value));
  const x=i=>44+i*490/Math.max(1,rows.length-1),y=v=>157-(v-low)/(high-low)*123;
  let path='',previous=false;
  rows.forEach((d,i)=>{if(d.value===null){previous=false;return}path+=(previous?' L ':' M ')+x(i)+','+y(d.value);previous=true});
  const ticks=[...new Set(Array.from({length:5},(_,i)=>Math.round((rows.length-1)*i/4)))];
  return `<section class="up-chart"><h3>${esc(label)}</h3><svg viewBox="0 0 560 190" role="img" aria-label="${esc(label)}，${points[0].date}至${points.at(-1).date}"><text x="8" y="15">${unit}</text>${[low,(low+high)/2,high].map(v=>`<line x1="44" x2="534" y1="${y(v)}" y2="${y(v)}" stroke="#e8edf6"/><text x="36" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}</text>`).join('')}<path d="${path}" fill="none" stroke="${color}" stroke-width="2.4"/>${valid.map(d=>{const i=rows.indexOf(d);return `<circle cx="${x(i)}" cy="${y(d.value)}" r="2.4" fill="${color}"><title>${d.date} ${label}：${fmt(d.value,2)} ${unit}</title></circle>`}).join('')}${ticks.map(i=>`<text x="${x(i)}" y="183" text-anchor="middle">${rows[i].date.slice(5)}</text>`).join('')}</svg></section>`;
}
