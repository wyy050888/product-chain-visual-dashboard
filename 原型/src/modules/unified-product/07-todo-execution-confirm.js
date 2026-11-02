// 原生popover进入顶层，避免被任务表格的横向滚动容器裁切。
let upExecutionConfirmSequence=0;
function upMountExecutionDeleteConfirm(trigger,onConfirm,onClose){
 const dialog=trigger.closest('dialog'),panel=document.createElement('div'),events=new AbortController();
 const id='up-execution-confirm-'+(++upExecutionConfirmSequence);let open=true;
 panel.id=id;panel.className='up-execution-confirm-popover';panel.setAttribute('popover','manual');panel.setAttribute('role','alertdialog');panel.setAttribute('aria-label','删除执行事项确认');
 panel.innerHTML=`<p>确认删除此执行事项？</p><div class="up-execution-confirm-actions"><button type="button" class="btn small" data-execution-delete-cancel>取消</button><button type="button" class="btn small up-todo-delete-confirm" data-execution-delete-confirm="${esc(trigger.dataset.executionDelete)}">删除</button></div><p class="up-todo-dialog-error" role="alert" hidden></p>`;
 const close=(focus=false)=>{
  if(!open)return;open=false;events.abort();if(panel.matches(':popover-open'))panel.hidePopover();panel.remove();trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');onClose();if(focus&&trigger.isConnected)trigger.focus({preventScroll:true});
 };
 const position=()=>{
  if(!open)return;const anchor=trigger.getBoundingClientRect();
  if(!trigger.isConnected||anchor.right<0||anchor.left>innerWidth||anchor.bottom<0||anchor.top>innerHeight){close();return}
  panel.style.width=Math.min(240,innerWidth-16)+'px';const rect=panel.getBoundingClientRect(),down=anchor.bottom+8+rect.height<=innerHeight-8;
  const left=Math.max(8,Math.min(anchor.right-rect.width,innerWidth-rect.width-8));
  panel.style.left=left+'px';panel.style.top=Math.max(8,Math.min(down?anchor.bottom+8:anchor.top-rect.height-8,innerHeight-rect.height-8))+'px';
  panel.dataset.placement=down?'below':'above';panel.style.setProperty('--confirm-arrow',Math.max(16,Math.min(anchor.left+anchor.width/2-left,rect.width-16))+'px');
 };
 dialog.append(panel);trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-expanded','true');panel.showPopover();position();
 panel.querySelector('[data-execution-delete-cancel]').onclick=()=>close(true);
 panel.querySelector('[data-execution-delete-confirm]').onclick=()=>{
  try{onConfirm();close()}catch(error){const note=panel.querySelector('[role=alert]');note.hidden=false;note.textContent=error.message;position()}
 };
 panel.onfocusout=()=>queueMicrotask(()=>{if(open&&panel.isConnected&&!panel.contains(document.activeElement))close()});
 panel.onkeydown=event=>{
  if(event.key==='Tab'&&document.activeElement===panel.querySelector(event.shiftKey?'[data-execution-delete-cancel]':'[data-execution-delete-confirm]'))close(true);
 };
 document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target)&&!trigger.contains(event.target))close()},{capture:true,signal:events.signal});
 document.addEventListener('scroll',position,{capture:true,signal:events.signal});window.addEventListener('resize',position,{signal:events.signal});
 panel.querySelector('[data-execution-delete-cancel]').focus({preventScroll:true});return {close};
}
