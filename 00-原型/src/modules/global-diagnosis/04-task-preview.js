// 台账按行展开长文本，报告说明仍按单元格展开；分页重绘后恢复收起。
function gdTaskPreviewRow(button){
 const row=button.closest('tr[data-gd-task]');return row?.closest('table')?.dataset.columnKey==='gd-ledger-columns-v3'?row:null;
}
function gdCellPreview(markup){return '<div class="gd-task-cell" data-ui-cell-inline><div class="gd-task-preview" data-ui-cell-content>'+markup+'</div><button type="button" class="gd-task-more" data-gd-cell-more aria-expanded="false" hidden>展开</button></div>'}
let gdTaskPreviewObserver=null,gdTaskPreviewSequence=0;
const gdTaskPreviewAnimations=new WeakMap();
// 读取最后一个可见文字行的真实末端，避免把入口钉在宽单元格的最右侧。
function gdReadCellTail(preview,expanded){
 const cell=preview.parentElement,box=preview.getBoundingClientRect(),origin=cell.getBoundingClientRect();
 const width=Math.min(parseFloat(getComputedStyle(cell).getPropertyValue('--gd-toggle-width')),box.width);
 const walker=document.createTreeWalker(preview,NodeFilter.SHOW_TEXT),range=document.createRange(),rects=[];
 let node;
 while((node=walker.nextNode())){
  if(!node.textContent.trim())continue;
  range.selectNodeContents(node);
  for(const rect of range.getClientRects()){
   if(!rect.height||rect.top>=box.bottom-1||rect.bottom<=box.top||rect.left>=box.right||rect.right<=box.left)continue;
   rects.push(rect);
  }
 }
 // 以最后一行的实际文字框定位，不将块间距或不同字号折算成固定行号。
 const last=rects.reduce((tail,rect)=>!tail||rect.bottom>tail.bottom?rect:tail,null);
 const line=last?rects.filter(rect=>rect.top<last.bottom-1&&rect.bottom>last.top+1):[];
 const right=line.reduce((value,rect)=>Math.max(value,Math.min(rect.right,box.right)),box.left);
 const fits=right+6+width<=box.right,nextLine=expanded&&!fits;
 const lineTop=last?Math.max(0,(last.top+last.bottom-22)/2-origin.top):0;
 const top=nextLine?box.bottom-origin.top:lineTop;
 return {cell,left:nextLine?0:Math.max(0,Math.min(right-box.left+6,box.width-width)),top,extra:expanded?Math.max(0,top+22-(box.bottom-origin.top)):0,compact:box.width<64};
}
function gdApplyCellTail(state){
 const {cell,left,top,extra,compact}=state;
 for(const [key,value] of [['left',left],['top',top],['extra',extra]])if(cell.style.getPropertyValue('--gd-toggle-'+key)!==value+'px')cell.style.setProperty('--gd-toggle-'+key,value+'px');
 if(cell.classList.contains('is-compact')!==compact)cell.classList.toggle('is-compact',compact);
}
function gdMountTaskPreviews(root){
 gdTaskPreviewObserver?.disconnect();
 const previews=[...root.querySelectorAll('.gd-table-scroll .gd-task-preview')];
 const measure=()=>{
   const states=previews.filter(el=>el.isConnected&&!el.parentElement.classList.contains('is-transitioning')).map(el=>{
    const button=el.parentElement.querySelector('[data-gd-cell-more]'),expanded=button.getAttribute('aria-expanded')==='true',clipped=uiCellClipped(el);
    return {button,expanded,clipped,label:gdTaskPreviewRow(button)?'本行':el.closest('td').dataset.label,tail:expanded||clipped?gdReadCellTail(el,expanded):null};
   });
   return ()=>{for(const {button,expanded,clipped,label,tail} of states){
    if(tail)gdApplyCellTail(tail);
    const hidden=!expanded&&!clipped,text=(expanded?'收起':'展开')+label+'完整内容';
    if(button.hidden!==hidden)button.hidden=hidden;
    if(button.getAttribute('aria-label')!==text)button.setAttribute('aria-label',text);
   }};
 };
 const refresh=()=>dashboardQueueLayout(root,measure);
 gdTaskPreviewObserver=new ResizeObserver(refresh);
 for(const preview of previews){
  preview.id='gd-task-preview-'+(++gdTaskPreviewSequence);
  preview.parentElement.querySelector('[data-gd-cell-more]').setAttribute('aria-controls',preview.id);
  gdTaskPreviewObserver.observe(preview);
 }
 // 行联动按钮同时声明所控制的文本，普通说明保留原单元格关系。
 for(const preview of previews){const button=preview.parentElement.querySelector('[data-gd-cell-more]'),row=gdTaskPreviewRow(button);if(row)button.setAttribute('aria-controls',[...row.querySelectorAll('.gd-task-preview')].map(el=>el.id).join(' '))}
 refresh();
}
function gdToggleTaskPreview(button){
 const expanded=button.getAttribute('aria-expanded')!=='true',row=gdTaskPreviewRow(button);
 const buttons=row?[...row.querySelectorAll('[data-gd-cell-more]')].filter(item=>!item.hidden||item.getAttribute('aria-expanded')==='true'||uiCellClipped(item.parentElement.querySelector('.gd-task-preview'))):[button];
 for(const item of buttons)gdSetTaskPreview(item,expanded);
}
function gdSetTaskPreview(button,expanded){
 const cell=button.closest('.gd-task-cell');
 // 每个长文本从当前高度接续动画，联动不重绘任务或改变正文。
 const from=cell.getBoundingClientRect().height,previous=gdTaskPreviewAnimations.get(cell);
 if(previous){gdTaskPreviewAnimations.delete(cell);previous.cancel()}
 cell.classList.remove('is-transitioning');cell.classList.toggle('is-expanded',expanded);
 button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'收起':'展开';
 button.setAttribute('aria-label',(expanded?'收起':'展开')+(gdTaskPreviewRow(button)?'本行':button.closest('td').dataset.label)+'完整内容');
 uiHideCellTooltip();
 gdApplyCellTail(gdReadCellTail(cell.querySelector('.gd-task-preview'),expanded));
 const to=cell.getBoundingClientRect().height;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||Math.abs(to-from)<1)return;
 // 过渡期间取消行截断，由外层高度逐步揭示/隐藏正文；结束后恢复自然高度。
 cell.classList.add('is-transitioning');
 const animation=cell.animate([{height:from+'px'},{height:to+'px'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
 gdTaskPreviewAnimations.set(cell,animation);
 animation.finished.then(()=>{
  if(gdTaskPreviewAnimations.get(cell)!==animation)return;
  gdTaskPreviewAnimations.delete(cell);cell.classList.remove('is-transitioning');
 },()=>{});
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-gd-cell-more]');if(button)gdToggleTaskPreview(button);
});
