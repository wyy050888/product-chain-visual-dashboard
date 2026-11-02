// 趋势与详情共享期间状态和控件；日范围映射到结束日所在月。
function upGradeTrendPeriod(state){
 const mode=['month','quarter','year'].includes(state.period?.mode)?state.period.mode:'month';
 const year=Number(state.end.slice(0,4)),month=Number(state.end.slice(5,7));
 return normalizePeriod({mode,year,value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1});
}
function upProductGradeBadge(level){return `<span class="up-product-grade ${level||'unrated'}" data-up-product-grade aria-label="产品分级 ${level||'未分级'}">${level||'未分级'}</span>`}
