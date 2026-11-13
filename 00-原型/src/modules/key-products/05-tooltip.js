// 圆点浮层复用本次图表的产品事实，不另算指标或依赖浏览器原生title。
const kpmPointTooltip=document.createElement('div');
kpmPointTooltip.id='kpm-point-tooltip';kpmPointTooltip.className='metric-tooltip kpm-point-tooltip';
kpmPointTooltip.setAttribute('role','tooltip');kpmPointTooltip.hidden=true;document.body.append(kpmPointTooltip);
let kpmPointAnchor=null,kpmPointHideTimer=null;
function kpmKeepPointTooltip(){clearTimeout(kpmPointHideTimer);kpmPointHideTimer=null}
function kpmHidePointTooltip(){kpmKeepPointTooltip();kpmPointAnchor?.removeAttribute('aria-describedby');kpmPointAnchor=null;kpmPointTooltip.hidden=true;}
function kpmInsidePointTooltip(target){return target instanceof Node&&Boolean(kpmPointAnchor?.contains(target)||kpmPointTooltip.contains(target))}
// 给圆点与浮层之间留出移动时间；进入任一区域即取消关闭。
function kpmSchedulePointTooltipHide(){kpmKeepPointTooltip();kpmPointHideTimer=setTimeout(kpmHidePointTooltip,250)}
function kpmPlacePointTooltip(anchor,event){
 const rect=anchor.getBoundingClientRect(),box=kpmPointTooltip.getBoundingClientRect();
 const x=event?.clientX??rect.right,y=event?.clientY??rect.bottom;
 kpmPointTooltip.style.left=Math.max(8,Math.min(innerWidth-box.width-8,x+16+box.width<=innerWidth-8?x+16:x-box.width-16))+'px';
 kpmPointTooltip.style.top=Math.max(8,Math.min(innerHeight-box.height-8,y+12+box.height<=innerHeight-8?y+12:y-box.height-12))+'px';
}
function kpmShowPointTooltip(anchor,event){
 const p=kpmChartPoints.get(anchor?.dataset.kpmPoint);if(!anchor?.isConnected||!p)return;
 kpmKeepPointTooltip();
 if(kpmPointAnchor!==anchor||kpmPointTooltip.hidden){
  kpmHidePointTooltip();hideMetricTooltip();upHideSalesTooltip();uiHideCellTooltip();
  const range=[kpmChartContext.start,kpmChartContext.end].map(d=>d.slice(2).replaceAll('-','/')).join(' — ');
  const values=[['gsv','GSV',upMoney(p.facts.gsvCents)],['profit','单品利润率',upPercent(p.profit),p.profit<0],['amount','利润额',upMoney(p.facts.profitCents),p.facts.profitCents<0],['units','销量',formatSalesQuantity(p.facts.sales)],['returns','总退',upPercent(p.facts.returnRate)],['received','已收退',upPercent(p.facts.receivedRate)]];
  const guidePrice=Number.isFinite(p.guidePriceCents)?fmt(p.guidePriceCents/100,2)+'元':'—';
  kpmPointTooltip.innerHTML=`<div class="kpm-point-product">${riskThumbnail(p.name)}<div class="kpm-point-info"><b>${esc(p.name)}</b><span class="kpm-point-grade ${p.level||'unrated'}">${p.level?p.level+'级'+(brcProductOperatingMatch(p.level,p.profit)?' · '+kpmGrades[p.level]:''):'—'}</span></div><div class="kpm-point-guide" data-kpm-metric="guidePrice"><span>指导价</span><strong>${esc(guidePrice)}</strong></div></div><div class="kpm-point-period">${esc(kpmChartContext.label)} · ${range}</div><div class="kpm-point-values">${values.map(([key,label,value,red])=>`<div data-kpm-metric="${key}"><span>${label}</span><strong class="${red?'negative':''}">${esc(value)}</strong></div>`).join('')}</div>`;
  kpmPointTooltip.dataset.spuId=p.spuId;kpmPointAnchor=anchor;anchor.setAttribute('aria-describedby',kpmPointTooltip.id);kpmPointTooltip.hidden=false;
 }
 kpmPlacePointTooltip(anchor,event);
}
const kpmPointSelector='#matrix.kpm-main circle[data-kpm-point]';
for(const type of ['pointerover','pointermove'])document.addEventListener(type,e=>{if(kpmPointTooltip.contains(e.target)){kpmKeepPointTooltip();return}const anchor=e.target.closest?.(kpmPointSelector);if(anchor)kpmShowPointTooltip(anchor,e)});
document.addEventListener('pointerout',e=>{if(kpmInsidePointTooltip(e.target)&&!kpmInsidePointTooltip(e.relatedTarget))kpmSchedulePointTooltipHide()});
document.addEventListener('focusin',e=>{if(e.target.matches?.(kpmPointSelector))kpmShowPointTooltip(e.target)});
document.addEventListener('focusout',e=>{if(kpmPointAnchor?.contains(e.target)&&!kpmInsidePointTooltip(e.relatedTarget)&&!kpmPointTooltip.matches(':hover'))kpmHidePointTooltip()});
document.addEventListener('click',e=>{if(!kpmPointTooltip.contains(e.target))kpmHidePointTooltip()},true);
document.addEventListener('scroll',e=>{if(kpmPointTooltip.contains(e.target))return;if(kpmPointAnchor&&document.activeElement===kpmPointAnchor)kpmPlacePointTooltip(kpmPointAnchor);else kpmHidePointTooltip()},true);
window.addEventListener('resize',kpmHidePointTooltip);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!kpmPointTooltip.hidden){e.preventDefault();e.stopImmediatePropagation();kpmHidePointTooltip()}},true);
