// 台账用顶层悬浮表格展示，避免被主表横向滚动区域裁切。
let ppLedgerPopover,ppLedgerAnchor,ppLedgerTimer;
function ppPositionLedger(anchor){
 const edge=12,viewport=document.documentElement,rect=anchor.getBoundingClientRect();
 const initial=ppLedgerPopover.getBoundingClientRect(),scale=initial.width/ppLedgerPopover.offsetWidth||1;
 const width=Math.max(0,viewport.clientWidth-edge*2),height=Math.max(0,viewport.clientHeight-edge*2);
 // 以可见区（扣除滚动条）约束外框；缩放后的坐标换回CSS像素。
 ppLedgerPopover.style.width=Math.min(1200,width/scale)+'px';
 ppLedgerPopover.style.maxHeight=height/scale+'px';
 ppLedgerPopover.style.setProperty('--pp-ledger-max-height',height/scale+'px');
 const box=ppLedgerPopover.getBoundingClientRect();
 const left=Math.max(edge,Math.min(rect.left+rect.width/2-box.width/2,viewport.clientWidth-box.width-edge));
 const below=rect.bottom+10+box.height<=viewport.clientHeight-edge;
 const top=Math.max(edge,Math.min(below?rect.bottom+10:rect.top-box.height-10,viewport.clientHeight-box.height-edge));
 ppLedgerPopover.style.left=left/scale+'px';ppLedgerPopover.style.top=top/scale+'px';
 ppLedgerPopover.dataset.side=below?'below':'above';
 ppLedgerPopover.style.setProperty('--pp-arrow-left',Math.max(20,Math.min(box.width/scale-20,(rect.left+rect.width/2-left)/scale))+'px');
}
function ppHideLedger(){
 clearTimeout(ppLedgerTimer);
 if(ppLedgerPopover?.matches(':popover-open'))ppLedgerPopover.hidePopover();
 ppLedgerAnchor?.setAttribute('aria-expanded','false');ppLedgerAnchor=null;
}
function ppShowLedger(anchor){
 clearTimeout(ppLedgerTimer);
 if(ppLedgerAnchor===anchor&&ppLedgerPopover?.matches(':popover-open'))return;
 const project=withPeriod('projects',()=>ppRows().find(p=>p.id===Number(anchor.dataset.ppLedger)));
 if(!project)return;
 ppHideLedger();uiHideCellTooltip();
 if(!ppLedgerPopover){
  ppLedgerPopover=document.createElement('div');ppLedgerPopover.id='pp-ledger-popover';
  ppLedgerPopover.setAttribute('popover','manual');ppLedgerPopover.setAttribute('role','dialog');
  ppLedgerPopover.setAttribute('aria-label','项目风险台账');ppLedgerPopover.tabIndex=-1;
  document.body.append(ppLedgerPopover);
 }
 ppLedgerPopover.innerHTML=ppLedger(project);ppLedgerAnchor=anchor;
 anchor.setAttribute('aria-expanded','true');ppLedgerPopover.showPopover();
 ppPositionLedger(anchor);
}
function ppScheduleLedgerClose(){
 clearTimeout(ppLedgerTimer);ppLedgerTimer=setTimeout(ppHideLedger,180);
}
document.addEventListener('mouseover',e=>{
 const anchor=e.target.closest('#projects.pp-main [data-pp-ledger]');
 if(anchor)ppShowLedger(anchor);
 else if(ppLedgerPopover?.contains(e.target))clearTimeout(ppLedgerTimer);
});
document.addEventListener('mouseout',e=>{
 if(ppLedgerAnchor?.contains(e.relatedTarget)||ppLedgerPopover?.contains(e.relatedTarget))return;
 if(ppLedgerAnchor?.contains(e.target)||ppLedgerPopover?.contains(e.target))ppScheduleLedgerClose();
});
document.addEventListener('focusin',e=>{
 const anchor=e.target.closest('#projects.pp-main [data-pp-ledger]');
 if(anchor)ppShowLedger(anchor);else if(!ppLedgerPopover?.contains(e.target))ppHideLedger();
});
document.addEventListener('focusout',e=>{
 if(ppLedgerAnchor?.contains(e.relatedTarget)||ppLedgerPopover?.contains(e.relatedTarget))return;
 if(ppLedgerAnchor?.contains(e.target)||ppLedgerPopover?.contains(e.target))ppScheduleLedgerClose();
});
document.addEventListener('click',e=>{if(!ppLedgerAnchor?.contains(e.target)&&!ppLedgerPopover?.contains(e.target))ppHideLedger()});
document.addEventListener('scroll',e=>{if(!ppLedgerPopover?.contains(e.target))ppHideLedger()},true);
window.addEventListener('resize',ppHideLedger);
document.addEventListener('keydown',e=>{if(e.key==='Escape')ppHideLedger()});
