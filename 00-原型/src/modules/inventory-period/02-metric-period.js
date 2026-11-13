// 库存余额保持最新，期间指标使用独立时间范围。
const ipDefaultMetricPeriod=()=>({mode:'quarter',year:+DATA_CUTOFF.slice(0,4),value:Math.ceil(+DATA_CUTOFF.slice(5,7)/3)});
let ipMetricPeriod=ipDefaultMetricPeriod();
function ipWithMetricPeriod(period,run){
 const key='inventory-metrics',prior=localPeriods[key];localPeriods[key]={...period};
 try{return withPeriod(key,run)}finally{if(prior)localPeriods[key]=prior;else delete localPeriods[key]}
}
function ipMetricPeriodMarkup(period,{overview=false,showScope=true}={}){
 const html=periodControls('inventory',{period,label:'库存指标',follow:false});
 const scope=showScope?`<small class="ip-metric-scope">筛选影响：库存周转率、交付及时率、翻新闭环率${overview?'、爆款断货次数':''}</small>`:'';
 return `<div class="ip-metric-period">${scope}${html.replaceAll('data-time-','data-ip-time-')}</div>`;
}
function ipMountMetricPeriod(host,period,onChange){
 host.onclick=event=>{
  const button=event.target.closest('[data-ip-time-mode]');if(!button)return;
  event.preventDefault();event.stopPropagation();
  const end=bounds(period).cutoff,month=period.mode==='quarter'?period.value*3:period.mode==='year'?12:+end.slice(5,7),mode=button.dataset.ipTimeMode;
  onChange(normalizePeriod({mode,year:period.year,value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1}));
 };
 host.onchange=event=>{
  const select=event.target;if(!select.matches('[data-ip-time-year],[data-ip-time-value]'))return;
  event.stopPropagation();const next={...period};next[select.hasAttribute('data-ip-time-year')?'year':'value']=+select.value;onChange(normalizePeriod(next));
 };
}
