// 逐日趋势提示复用指标提示的视觉样式；事件委托适配列表翻页及重绘。
const rpTrendTooltip=document.createElement('div');
rpTrendTooltip.id='rp-trend-tooltip';
rpTrendTooltip.className='metric-tooltip rp-trend-tooltip';
rpTrendTooltip.setAttribute('role','tooltip');
rpTrendTooltip.hidden=true;
document.body.append(rpTrendTooltip);
let rpTrendActivePoint=null;
function rpHideTrendTooltip(){
 rpTrendActivePoint?.removeAttribute('aria-describedby');
 rpTrendActivePoint=null;rpTrendTooltip.hidden=true;
}
function rpShowTrendTooltip(point){
 if(!point?.isConnected)return;
 if(rpTrendActivePoint===point&&!rpTrendTooltip.hidden)return;
 rpHideTrendTooltip();hideMetricTooltip();
 rpTrendActivePoint=point;point.setAttribute('aria-describedby',rpTrendTooltip.id);
 const name={return:'总退货率',received:'已收退货率'}[point.dataset.trendMetric]||point.dataset.trendName;
 rpTrendTooltip.innerHTML=`<div class="rp-trend-tooltip-date">${esc(point.dataset.trendDate)}</div><div class="rp-trend-tooltip-value"><span>${esc(name)}</span><strong>${esc(point.dataset.trendValue)}</strong></div>`;
 rpTrendTooltip.hidden=false;
 const anchor=point.getBoundingClientRect(),box=rpTrendTooltip.getBoundingClientRect();
 const left=Math.max(8,Math.min(innerWidth-box.width-8,anchor.left+anchor.width/2-box.width/2));
 const below=anchor.bottom+8,top=below+box.height<=innerHeight-8?below:Math.max(8,anchor.top-box.height-8);
 rpTrendTooltip.style.left=left+'px';rpTrendTooltip.style.top=top+'px';
}
document.addEventListener('pointerover',e=>{
 const point=e.target.closest?.('[data-rp-trend-point]');
 if(point)rpShowTrendTooltip(point);
});
document.addEventListener('pointermove',e=>{
 const point=e.target.closest?.('[data-rp-trend-point]');if(point)rpShowTrendTooltip(point);
});
document.addEventListener('pointerout',e=>{
 if(rpTrendActivePoint&&e.target===rpTrendActivePoint&&e.relatedTarget!==rpTrendActivePoint)rpHideTrendTooltip();
});
document.addEventListener('focusin',e=>{
 if(e.target.matches?.('[data-rp-trend-point]'))rpShowTrendTooltip(e.target);
});
document.addEventListener('focusout',e=>{
 if(e.target===rpTrendActivePoint)rpHideTrendTooltip();
});
document.addEventListener('click',e=>{
 const point=e.target.closest?.('[data-rp-trend-point]');
 if(point)rpShowTrendTooltip(point);else rpHideTrendTooltip();
},true);
document.addEventListener('change',rpHideTrendTooltip,true);
document.addEventListener('scroll',rpHideTrendTooltip,true);
window.addEventListener('resize',rpHideTrendTooltip);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!rpTrendTooltip.hidden){e.preventDefault();e.stopPropagation();rpHideTrendTooltip()}
},true);
// 原节点被换掉、进入详情或关闭抽屉时不留下过期提示。
new MutationObserver(()=>{
 if(rpTrendActivePoint&&(!rpTrendActivePoint.isConnected||$('#overlay').hidden))rpHideTrendTooltip();
}).observe($('#dialogbody'),{childList:true,subtree:true});
new MutationObserver(rpHideTrendTooltip).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
