// 事件委托覆盖首页、抽屉、弹窗和动态表格；拖拽只改变目标列，不挤压相邻列。
const uiColumnStates=new WeakMap();
let uiColumnDrag=null,uiColumnFrame=0;
function uiColumnCells(table){
 const rows=[...uiColumnGrid(table.tHead?.rows).cells];
 for(const body of [...table.tBodies,...(table.tFoot?[table.tFoot]:[])])rows.push(...uiColumnGrid(body.rows).cells);
 return rows.map(entry=>{const css=getComputedStyle(entry.cell);return {...entry,left:css.position==='sticky'&&css.left!=='auto',right:css.position==='sticky'&&css.right!=='auto'}});
}
function uiColumnApply(state,widths){
 const {table}=state;state.widths=[...widths];
 let group=table.querySelector(':scope > colgroup');
 if(!group){group=document.createElement('colgroup');table.prepend(group)}
 if(group.children.length!==widths.length)group.replaceChildren(...widths.map(()=>document.createElement('col')));
 const offsets=[0];for(const w of widths)offsets.push(offsets.at(-1)+w);
 [...group.children].forEach((col,i)=>{col.style.setProperty('width',widths[i]+'px','important')});
 for(const {cell,start,span,left,right} of state.cells){
  cell.style.setProperty('width',offsets[start+span]-offsets[start]+'px','important');
  cell.style.setProperty('min-width','0','important');cell.style.setProperty('max-width','none','important');
  if(left)cell.style.setProperty('left',offsets[start]+'px','important');
  if(right)cell.style.setProperty('right',offsets.at(-1)-offsets[start+span]+'px','important');
 }
 table.style.setProperty('table-layout','fixed','important');
 for(const key of ['width','min-width'])table.style.setProperty(key,offsets.at(-1)+'px','important');
 table.style.setProperty('max-width','none','important');table.classList.add('ui-table-widths');
 // 保留原表格节点和选择器；缺少滚动容器时只在其承载层开启横向滚动。
 const host=table.parentElement;if(host&&getComputedStyle(host).overflowX==='visible')host.style.overflowX='auto';
 for(const handle of table.querySelectorAll('[data-ui-column-handle]'))handle.setAttribute('aria-valuenow',widths[+handle.dataset.uiColumnHandle]);
}
function uiColumnInit(table){
 if(!table.tHead)return;
 const grid=uiColumnGrid(table.tHead.rows);if(!grid.count)return;
 const key=uiColumnKey(table,grid),prior=uiColumnStates.get(table);
 if(prior&&prior.key===key&&prior.grid.cells.length===grid.cells.length&&prior.grid.cells.every((entry,i)=>entry.cell===grid.cells[i].cell)){
  if(prior.widths){prior.cells=uiColumnCells(table);uiColumnApply(prior,prior.widths)}return;
 }
 const state={table,key,grid,cells:uiColumnCells(table),widths:null};uiColumnStates.set(table,state);
 for(const {cell,start,span} of grid.cells){
  if(getComputedStyle(cell).position==='static')cell.style.position='relative';
  let handle=cell.querySelector(':scope > [data-ui-column-handle]');
  if(!handle){handle=document.createElement('span');handle.className='ui-column-handle';cell.append(handle)}
  handle.dataset.uiColumnHandle=start+span-1;handle.tabIndex=0;handle.setAttribute('role','separator');
  handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','调整'+uiColumnLabel(cell)+'列宽');
  handle.setAttribute('aria-valuemin',uiColumnMin);handle.setAttribute('aria-valuemax',uiColumnMax);if(!table.closest('#lifecycle'))handle.title='拖动调整列宽，方向键微调';
 }
 const saved=uiColumnSaved(key,grid.count);if(saved)uiColumnApply(state,saved);
}
function uiColumnFlush(){
 uiColumnFrame=0;if(!uiColumnDrag)return;
 const d=uiColumnDrag;if(!d.state.table.isConnected)return;
 const widths=[...d.original];widths[d.index]=Math.max(uiColumnMin,Math.min(uiColumnMax,Math.round(d.original[d.index]+d.x-d.startX)));
 uiColumnApply(d.state,widths);
}
function uiColumnFinish(cancel=false){
 if(!uiColumnDrag)return;cancelAnimationFrame(uiColumnFrame);uiColumnFlush();
 const d=uiColumnDrag;uiColumnDrag=null;
 if(d.state.table.isConnected){if(cancel)uiColumnApply(d.state,d.original);else uiColumnRemember(d.state.key,d.state.widths)}
 document.body.classList.remove('ui-column-resizing');d.handle.classList.remove('active');
 if(d.handle.hasPointerCapture?.(d.pointerId))d.handle.releasePointerCapture(d.pointerId);
}
document.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('[data-ui-column-handle]');if(!handle||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();uiHideCellTooltip();
 const table=handle.closest('table');uiColumnInit(table);const state=uiColumnStates.get(table);
 const widths=state.widths||uiColumnWidths(table,state.grid);state.cells=uiColumnCells(table);
 uiColumnDrag={state,handle,pointerId:e.pointerId,index:+handle.dataset.uiColumnHandle,original:[...widths],startX:e.clientX,x:e.clientX};
 handle.setPointerCapture(e.pointerId);handle.classList.add('active');document.body.classList.add('ui-column-resizing');
},true);
document.addEventListener('pointermove',e=>{
 if(!uiColumnDrag||e.pointerId!==uiColumnDrag.pointerId)return;
 e.preventDefault();uiColumnDrag.x=e.clientX;if(!uiColumnFrame)uiColumnFrame=requestAnimationFrame(uiColumnFlush);
},true);
document.addEventListener('pointerup',()=>uiColumnFinish(),true);
document.addEventListener('pointercancel',()=>uiColumnFinish(true),true);
window.addEventListener('blur',()=>uiColumnFinish(true));
for(const name of ['click','dblclick'])document.addEventListener(name,e=>{if(e.target.closest('[data-ui-column-handle]')){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&uiColumnDrag){e.preventDefault();e.stopImmediatePropagation();uiColumnFinish(true);return}
 const handle=e.target.closest('[data-ui-column-handle]');if(!handle||!['ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();e.stopImmediatePropagation();const table=handle.closest('table');uiColumnInit(table);const state=uiColumnStates.get(table);
 const widths=state.widths||uiColumnWidths(table,state.grid),index=+handle.dataset.uiColumnHandle;
 widths[index]=Math.max(uiColumnMin,Math.min(uiColumnMax,widths[index]+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?24:8)));
 state.cells=uiColumnCells(table);uiColumnApply(state,widths);uiColumnRemember(state.key,widths);
},true);
const uiColumnPending=new Set();let uiColumnScan=0;
function uiColumnQueue(table){
 uiColumnPending.add(table);if(uiColumnScan)return;
 uiColumnScan=requestAnimationFrame(()=>{uiColumnScan=0;for(const target of uiColumnPending)if(target.isConnected)uiColumnInit(target);uiColumnPending.clear()});
}
new MutationObserver(records=>{
 if(uiColumnDrag&&!uiColumnDrag.state.table.isConnected)uiColumnFinish(true);
 for(const record of records)for(const node of record.addedNodes){
  if(node.nodeType!==1||node.matches('.ui-column-handle,colgroup,col'))continue;
  const table=node.closest('table');if(table)uiColumnQueue(table);
  for(const nested of node.querySelectorAll('table'))uiColumnQueue(nested);
 }
}).observe(document.body,{childList:true,subtree:true});
for(const table of document.querySelectorAll('table'))uiColumnQueue(table);
