// 台账用顶层悬浮表格展示，避免被主表横向滚动区域裁切。
let ppLedgerPopover,ppLedgerAnchor,ppLedgerTimer;
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
 const rect=anchor.getBoundingClientRect(),box=ppLedgerPopover.getBoundingClientRect();
 const left=Math.max(12,Math.min(rect.left+rect.width/2-box.width/2,innerWidth-box.width-12));
 const below=rect.bottom+10+box.height<=innerHeight-12;
 ppLedgerPopover.style.left=left+'px';
 ppLedgerPopover.style.top=Math.max(12,below?rect.bottom+10:rect.top-box.height-10)+'px';
 ppLedgerPopover.dataset.side=below?'below':'above';
 ppLedgerPopover.style.setProperty('--pp-arrow-left',Math.max(20,Math.min(box.width-20,rect.left+rect.width/2-left))+'px');
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
