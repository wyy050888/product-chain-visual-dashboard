// 圆点浮层复用本次图表的产品事实，不另算指标或依赖浏览器原生title。
const kpmPointTooltip=document.createElement('div');
kpmPointTooltip.id='kpm-point-tooltip';kpmPointTooltip.className='metric-tooltip kpm-point-tooltip';
kpmPointTooltip.setAttribute('role','tooltip');kpmPointTooltip.hidden=true;document.body.append(kpmPointTooltip);
let kpmPointAnchor=null;
function kpmHidePointTooltip(){kpmPointAnchor?.removeAttribute('aria-describedby');kpmPointAnchor=null;kpmPointTooltip.hidden=true;}
function kpmPlacePointTooltip(anchor,event){
 const rect=anchor.getBoundingClientRect(),box=kpmPointTooltip.getBoundingClientRect();
 const x=event?.clientX??rect.right,y=event?.clientY??rect.bottom;
 kpmPointTooltip.style.left=Math.max(8,Math.min(innerWidth-box.width-8,x+16+box.width<=innerWidth-8?x+16:x-box.width-16))+'px';
 kpmPointTooltip.style.top=Math.max(8,Math.min(innerHeight-box.height-8,y+12+box.height<=innerHeight-8?y+12:y-box.height-12))+'px';
}
function kpmShowPointTooltip(anchor,event){
 const p=kpmChartPoints.get(anchor?.dataset.kpmPoint);if(!anchor?.isConnected||!p)return;
 if(kpmPointAnchor!==anchor||kpmPointTooltip.hidden){
  kpmHidePointTooltip();hideMetricTooltip();upHideContactTooltip();upHideSalesTooltip();uiHideCellTooltip();
  const range=[kpmChartContext.start,kpmChartContext.end].map(d=>d.slice(2).replaceAll('-','/')).join(' — ');
  const values=[['销售额',upMoney(p.facts.gmvCents)],['单品利润率',upPercent(p.profit),p.profit<0],['利润额',upMoney(p.facts.profitCents),p.facts.profitCents<0],['销量',fmt(p.facts.sales)],['总退',upPercent(p.facts.returnRate)],['已收退',upPercent(p.facts.receivedRate)]];
  kpmPointTooltip.innerHTML=`<div class="kpm-point-product">${riskThumbnail(p.name)}<div><b>${esc(p.name)}</b><span class="kpm-point-grade ${p.level}">${p.level} ${kpmGrades[p.level]}</span></div></div><div class="kpm-point-meta">SPU码：${esc(p.spuCode)}<br>${esc(p.brand)} · ${esc(p.category)} · ${esc(p.season)}</div><div class="kpm-point-period">${esc(kpmChartContext.label)} · ${range}</div><div class="kpm-point-values">${values.map(([label,value,red])=>`<div><span>${label}</span><strong class="${red?'negative':''}">${esc(value)}</strong></div>`).join('')}</div>`;
  kpmPointTooltip.dataset.spuId=p.spuId;kpmPointAnchor=anchor;anchor.setAttribute('aria-describedby',kpmPointTooltip.id);kpmPointTooltip.hidden=false;
 }
 kpmPlacePointTooltip(anchor,event);
}
const kpmPointSelector='#matrix.kpm-main circle[data-kpm-point]';
for(const type of ['pointerover','pointermove'])document.addEventListener(type,e=>{const anchor=e.target.closest?.(kpmPointSelector);if(anchor)kpmShowPointTooltip(anchor,e)});
document.addEventListener('pointerout',e=>{if(kpmPointAnchor?.contains(e.target)&&!kpmPointAnchor.contains(e.relatedTarget))kpmHidePointTooltip()});
document.addEventListener('focusin',e=>{if(e.target.matches?.(kpmPointSelector))kpmShowPointTooltip(e.target)});
document.addEventListener('focusout',e=>{if(kpmPointAnchor?.contains(e.target))kpmHidePointTooltip()});
document.addEventListener('click',kpmHidePointTooltip,true);
document.addEventListener('scroll',()=>{if(kpmPointAnchor&&document.activeElement===kpmPointAnchor)kpmPlacePointTooltip(kpmPointAnchor);else kpmHidePointTooltip()},true);
window.addEventListener('resize',kpmHidePointTooltip);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!kpmPointTooltip.hidden){e.preventDefault();e.stopImmediatePropagation();kpmHidePointTooltip()}},true);
