// 表格单元格被截断时展示原文；事件委托覆盖分页与动态表格，无需逐表补文案。
const uiCellTooltip=document.createElement('div');
uiCellTooltip.id='ui-cell-tooltip';uiCellTooltip.className='ui-cell-tooltip';uiCellTooltip.setAttribute('role','tooltip');uiCellTooltip.setAttribute('popover','manual');
document.body.append(uiCellTooltip);
let uiTooltipCell=null,uiTooltipTimer;
function uiCellClipped(cell){
 return [cell,...cell.querySelectorAll('*')].some(el=>{
  if(!el.clientWidth||el.matches('input,select,textarea,button,svg,path'))return false;
  const style=getComputedStyle(el);
  return (el===cell||['hidden','clip'].includes(style.overflow)||style.textOverflow==='ellipsis'||Number(style.webkitLineClamp)>0)
   &&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1);
 });
}
function uiHideCellTooltip(){
 clearTimeout(uiTooltipTimer);
 if(uiCellTooltip.matches(':popover-open'))uiCellTooltip.hidePopover();
 if(uiTooltipCell){const ids=(uiTooltipCell.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==uiCellTooltip.id);if(ids.length)uiTooltipCell.setAttribute('aria-describedby',ids.join(' '));else uiTooltipCell.removeAttribute('aria-describedby')}
 uiTooltipCell=null;
}
function uiShowCellTooltip(cell){
 uiHideCellTooltip();if(cell.closest('#pp-ledger-popover,#lifecycle')||cell.querySelector('[data-pp-ledger]')||!uiCellClipped(cell))return;
 uiTooltipCell=cell;
 uiTooltipTimer=setTimeout(()=>{
  if(!cell.isConnected){uiHideCellTooltip();return}
  uiCellTooltip.textContent=cell.innerText.trim();
  cell.setAttribute('aria-describedby',[(cell.getAttribute('aria-describedby')||''),uiCellTooltip.id].filter(Boolean).join(' '));
  uiCellTooltip.showPopover();
  const rect=cell.getBoundingClientRect(),tip=uiCellTooltip.getBoundingClientRect();
  uiCellTooltip.style.left=Math.max(12,Math.min(rect.left,innerWidth-tip.width-12))+'px';
  uiCellTooltip.style.top=(rect.bottom+8+tip.height<=innerHeight?rect.bottom+8:Math.max(12,rect.top-tip.height-8))+'px';
 },180);
}
document.addEventListener('mouseover',e=>{
 if(uiCellTooltip.contains(e.target)){clearTimeout(uiTooltipTimer);return}
 const cell=e.target.closest('td,th');
 if(cell===uiTooltipCell)return;
 if(!cell||e.target.closest('button,input,select,textarea,[data-ui-column-handle]')){uiHideCellTooltip();return}
 uiShowCellTooltip(cell);
});
document.addEventListener('mouseout',e=>{
 if(uiTooltipCell?.contains(e.relatedTarget)||uiCellTooltip.contains(e.relatedTarget))return;
 if(uiTooltipCell?.contains(e.target)||uiCellTooltip.contains(e.target)){clearTimeout(uiTooltipTimer);uiTooltipTimer=setTimeout(uiHideCellTooltip,120)}
});
document.addEventListener('focusin',e=>{const cell=e.target.closest('td,th');if(cell)uiShowCellTooltip(cell)});
document.addEventListener('scroll',e=>{if(!uiCellTooltip.contains(e.target))uiHideCellTooltip()},true);
window.addEventListener('resize',uiHideCellTooltip);
document.addEventListener('keydown',e=>{if(e.key==='Escape')uiHideCellTooltip()});
