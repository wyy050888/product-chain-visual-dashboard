// 趋势与详情共享期间状态和控件；日范围映射到结束日所在月。
function upGradeTrendPeriod(state){
 const mode=['month','quarter','year'].includes(state.period?.mode)?state.period.mode:'month';
 const year=Number(state.end.slice(0,4)),month=Number(state.end.slice(5,7));
 return normalizePeriod({mode,year,value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1});
}
function upMountGradeTrendPeriod(root,state,onChange){
 const host=root.querySelector('.up-grade-period');if(!host)return;
 drawerMountPeriod(host,upGradeTrendPeriod(state),period=>{
  const active=document.activeElement,attribute=['data-drawer-time-mode','data-drawer-time-year','data-drawer-time-value'].find(key=>active?.hasAttribute(key));
  const selector=attribute?'['+attribute+(attribute==='data-drawer-time-mode'?'="'+active.getAttribute(attribute)+'"':'')+']':null;
  onChange(period);
  if(selector)root.querySelector('.up-grade-period '+selector)?.focus({preventScroll:true});
 },'up-grade-date-trigger');
 host.querySelector('[data-drawer-time-day]')?.remove();
 host.querySelector('.period-segment').setAttribute('aria-label','分级趋势时间粒度');
}
function upProductGradeBadge(level){return `<span class="up-product-grade ${level||'unrated'}" data-up-product-grade aria-label="产品分级 ${level||'未命中等级'}">${level||'—'}</span>`}
