// 日趋势为固定样例：GSV和利润按月分摊，利润率按利润/GSV计算，与卡片汇总一致。
const msTrendSeries=new Map();
function msDailySeries(index,p=periodFor('sales'),range=null){
 const b=bounds(p);range||={start:b.start,end:b.cutoff};
 const values=new Map(),selected=index<0?[0,1,2,3]:[index];
 for(let monthKey=range.start.slice(0,7);monthKey<=range.end.slice(0,7);monthKey=riskMonthShift(monthKey,1)){
  const year=Number(monthKey.slice(0,4)),month=Number(monthKey.slice(5,7));
  const start=monthKey+'-01',end=iso(new Date(Date.UTC(year,month,0))),last=end<DATA_CUTOFF?end:DATA_CUTOFF;
  if(last<start)continue;
  const dates=Array.from({length:aiFlowDayDiff(start,last)+1},(_,i)=>shiftDate(start,i));
  for(const chain of selected){
   const weights=dates.map((_,i)=>100+((i*7+chain*11+month*3)%19)-9);
   const amounts=splitTarget(Math.round(salesMonthActual(chain,month,year)*100),weights);
   const margin=baseSales[chain].profit+(month-9)*.08;
   const offsets=dates.map((_,i)=>Math.sin((i+chain*2+month)*.7)*.8+Math.cos(i*.31+chain)*.35);
   const total=amounts.reduce((sum,value)=>sum+value,0),weightedOffset=total?offsets.reduce((sum,value,i)=>sum+value*amounts[i],0)/total:0;
   dates.forEach((date,i)=>{
    const row=values.get(date)||{value:0,gross:0},sale=amounts[i]/100;
    row.value+=sale;row.gross+=sale*(margin+offsets[i]-weightedOffset)/100;values.set(date,row);
   });
  }
 }
 return [...values].filter(([date])=>date>=range.start&&date<=range.end).map(([date,row])=>({date,...row,margin:row.value?row.gross/row.value*100:null}));
}
function msTrendDailySeries(index,p=periodFor('sales')){
 const b=bounds(p),range=recentTrendRange(b.start,b.cutoff,{quarter:'week',year:'month'}[p.mode]);
 return msDailySeries(index,p,range);
}
// 季度看近24个自然周，年度看近24个自然月，利润率按累计利润/GSV计算。
function msTrendBuckets(rows,mode){
 const groups=new Map();
 for(const row of rows){
  const weekday=new Date(row.date+'T00:00:00Z').getUTCDay();
  const key=mode==='year'?row.date.slice(0,7):mode==='quarter'?shiftDate(row.date,-((weekday+6)%7)):row.date;
  const group=groups.get(key)||{date:row.date,end:row.date,value:0,gross:0};
  group.end=row.date;group.value+=row.value;group.gross+=row.gross;groups.set(key,group);
 }
 return [...groups.values()].map(row=>({...row,margin:row.value?row.gross/row.value*100:null,
  label:mode==='year'?row.date.slice(0,4)+'年'+Number(row.date.slice(5,7))+'月':mode==='quarter'?row.date+' — '+row.end+'（周）':row.date,
  axisLabel:mode==='year'?row.date.slice(0,7):row.date}));
}
function msTrend(index){
 const period=periodFor('sales'),dimension={quarter:'周',year:'月'}[period.mode]||'日';
 const series=msTrendBuckets(msTrendDailySeries(index,period),period.mode);msTrendSeries.set(String(index),series);
 if(!series.length)return '<div class="ms-trend-empty">暂无趋势数据</div>';
 // 两种量纲分别缩放，共用日期轴；悬浮展示原始金额和利润率。
 const pointsFor=key=>{
  const values=series.map(r=>r[key]).filter(Number.isFinite),max=Math.max(...values,1),min=Math.min(...values),span=Math.max(max-min,Math.abs(max)*.2,1);
  return series.map((r,i)=>[series.length===1?150:i/(series.length-1)*300,Number.isFinite(r[key])?54-(r[key]-min)/span*44:54]);
 };
 const area=(key,color)=>{const points=pointsFor(key),line=points.map(p=>p.join(',')).join(' ');return '<polygon class="ms-trend-area" points="'+points[0][0]+',60 '+line+' '+points.at(-1)[0]+',60" fill="'+color+'" fill-opacity=".10"/><polyline data-ms-series="'+key+'" points="'+line+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>'};
 const first=series[0].axisLabel,last=period.mode==='year'?series.at(-1).axisLabel:series.at(-1).end;
 return '<div class="ms-trend" data-ms-trend="'+index+'" tabindex="0" data-granularity="'+dimension+'" aria-label="GSV与利润率'+dimension+'趋势，左右方向键查看期间" data-cursor="0"><svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">'+area('value','#8c8bff')+area('margin','#20b6a5')+'<line class="ms-trend-guide" y1="0" y2="60" stroke="#9aa8bc" stroke-dasharray="3 3" visibility="hidden"/></svg><div class="ms-trend-dates"><span>'+first+'</span><span>'+last+'</span></div><div class="ms-trend-tip" role="tooltip" hidden></div></div>';
}
function msShowTrend(root,cursor){
 const series=msTrendSeries.get(root.dataset.msTrend);if(!series?.length)return;
 cursor=Math.max(0,Math.min(series.length-1,cursor));root.dataset.cursor=cursor;
 const row=series[cursor],percent=series.length===1?50:cursor/(series.length-1)*100,tip=root.querySelector('.ms-trend-tip');
 tip.innerHTML='<span>'+row.label+'</span>'+ (root.dataset.granularity==='月'?'<span class="ms-trend-tip-range">'+row.date+' — '+row.end+'</span>':'')+'<strong><i class="ms-trend-gsv"></i>GSV <b>'+esc(msMoney(row.value))+'</b></strong><strong><i class="ms-trend-margin"></i>利润率 <b>'+esc(msPercent(row.margin))+'</b></strong>';tip.hidden=false;
 tip.style.left=Math.max(0,Math.min(root.clientWidth-tip.offsetWidth,percent/100*root.clientWidth-tip.offsetWidth/2))+'px';
 const guide=root.querySelector('.ms-trend-guide');guide.setAttribute('x1',percent*3);guide.setAttribute('x2',percent*3);guide.setAttribute('visibility','visible');
}
function msHideTrend(root){root.querySelector('.ms-trend-tip').hidden=true;root.querySelector('.ms-trend-guide').setAttribute('visibility','hidden')}
document.addEventListener('pointermove',e=>{const root=e.target.closest('[data-ms-trend]');if(!root)return;const count=msTrendSeries.get(root.dataset.msTrend)?.length||0,box=root.getBoundingClientRect();msShowTrend(root,Math.round((e.clientX-box.left)/box.width*(count-1)))});
document.addEventListener('pointerout',e=>{const root=e.target.closest('[data-ms-trend]');if(root&&!root.contains(e.relatedTarget))msHideTrend(root)});
document.addEventListener('focusin',e=>{const root=e.target.closest('[data-ms-trend]');if(root)msShowTrend(root,+root.dataset.cursor)});
document.addEventListener('focusout',e=>{const root=e.target.closest('[data-ms-trend]');if(root)msHideTrend(root)});
document.addEventListener('keydown',e=>{const root=e.target.closest('[data-ms-trend]');if(!root)return;if(e.key==='Escape')return msHideTrend(root);if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const count=msTrendSeries.get(root.dataset.msTrend).length;msShowTrend(root,e.key==='Home'?0:e.key==='End'?count-1:+root.dataset.cursor+(e.key==='ArrowRight'?1:-1))});
window.dashboardSalesTrendSnapshot=(index,daily=false)=>daily?msTrendDailySeries(index):msTrendBuckets(msTrendDailySeries(index),periodFor('sales').mode);
