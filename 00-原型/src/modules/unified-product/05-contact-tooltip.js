// 两类进线共用一个浮窗，条数占比以两类进线总条数为分母。
const upContactTooltip=document.createElement('div');
upContactTooltip.id='up-contact-tooltip';upContactTooltip.className='metric-tooltip up-contact-tooltip';
upContactTooltip.setAttribute('role','tooltip');upContactTooltip.hidden=true;document.body.append(upContactTooltip);
let upContactAnchor=null;
function upHideContactTooltip(){
 upContactAnchor?.removeAttribute('aria-describedby');upContactAnchor=null;upContactTooltip.hidden=true;
}
function upShowContactTooltip(anchor,event){
 if(!anchor?.isConnected)return;
 if(upContactAnchor!==anchor||upContactTooltip.hidden){
  upHideContactTooltip();upHideSalesTooltip();hideMetricTooltip();uiHideCellTooltip();
  const parts=[...anchor.closest('.up-contact-bar').querySelectorAll('[data-up-contact-detail]')].map(node=>JSON.parse(node.dataset.upContactDetail));
  upContactTooltip.innerHTML=parts.map(part=>`<div class="up-contact-tooltip-row"><span><i class="${part.key}"></i>${esc(part.name.replace(/进线$/,''))}</span><b>${Number.isFinite(part.count)?fmt(part.count)+'条':'—'} ${upPercent(part.share).replace(/\.0%$/,'%')}</b></div>`).join('');
  upContactAnchor=anchor;anchor.setAttribute('aria-describedby',upContactTooltip.id);upContactTooltip.hidden=false;
 }
 const rect=anchor.getBoundingClientRect(),box=upContactTooltip.getBoundingClientRect(),x=event?.clientX??rect.right,y=event?.clientY??rect.bottom;
 upContactTooltip.style.left=Math.max(8,Math.min(innerWidth-box.width-8,x+16+box.width<=innerWidth-8?x+16:x-box.width-16))+'px';
 upContactTooltip.style.top=Math.max(8,Math.min(innerHeight-box.height-8,y+12+box.height<=innerHeight-8?y+12:y-box.height-12))+'px';
}
for(const type of ['pointerover','pointermove'])document.addEventListener(type,e=>{const anchor=e.target.closest?.('[data-up-contact-detail]');if(anchor)upShowContactTooltip(anchor,e)});
document.addEventListener('pointerout',e=>{if(upContactAnchor?.contains(e.target)&&!upContactAnchor.contains(e.relatedTarget))upHideContactTooltip()});
// 键盘聚焦可能先滚动抽屉；等滚动事件处理后再显示，避免刚打开就被收起。
document.addEventListener('focusin',e=>{const anchor=e.target.closest?.('[data-up-contact-detail]');if(anchor)requestAnimationFrame(()=>{if(anchor===document.activeElement)upShowContactTooltip(anchor)})});
document.addEventListener('focusout',e=>{if(upContactAnchor?.contains(e.target))upHideContactTooltip()});
document.addEventListener('click',e=>{const anchor=e.target.closest?.('[data-up-contact-detail]');if(anchor)upShowContactTooltip(anchor,e);else upHideContactTooltip()},true);
document.addEventListener('scroll',upHideContactTooltip,true);document.addEventListener('change',upHideContactTooltip,true);
window.addEventListener('resize',upHideContactTooltip);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!upContactTooltip.hidden){e.preventDefault();e.stopImmediatePropagation();upHideContactTooltip()}},true);
new MutationObserver(()=>{if(upContactAnchor&&!upContactAnchor.isConnected)upHideContactTooltip()}).observe($('#dialogbody'),{childList:true,subtree:true});
new MutationObserver(upHideContactTooltip).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
