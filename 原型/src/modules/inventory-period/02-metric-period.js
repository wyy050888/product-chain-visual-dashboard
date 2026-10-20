// 三项期间指标独立于库存快照；首页两表互不串用，抽屉继承后独立维护。
const ipDefaultMetricPeriod=()=>({mode:'recent30',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7)});
const ipMetricPeriods={category:ipDefaultMetricPeriod(),brand:ipDefaultMetricPeriod()};
function ipWithMetricPeriod(period,run){
 const key='inventory-metrics',prior=localPeriods[key];localPeriods[key]={...period};
 try{return withPeriod(key,run)}finally{if(prior)localPeriods[key]=prior;else delete localPeriods[key]}
}
function ipMetricPeriodMarkup(period){
 const prior=localPeriods.matrix;localPeriods.matrix={...period};let html;
 try{html=periodControls('matrix')}finally{if(prior)localPeriods.matrix=prior;else delete localPeriods.matrix}
 const range=bounds(period);
 return `<div class="ip-metric-period"><span class="metric-help" role="button" tabindex="0" aria-label="时间筛选影响指标" data-metric-rule="时间筛选影响指标：库存周转率、交付及时率、翻新延期天数"></span>${html.replaceAll('data-time-','data-ip-time-').replaceAll('关键产品','库存指标')}<small class="ip-metric-range">${range.start} — ${range.cutoff}</small></div>`;
}
function ipMountMetricPeriod(host,period,onChange){
 host.querySelector('.follow-time')?.remove();
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
