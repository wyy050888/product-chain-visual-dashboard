// 比较当前表单与初始值，只有尚未保存的实际内容变更才拦截关闭。
function gdTaskEntrySnapshot(form){
 const values=root=>[...root.querySelectorAll('input,textarea,select')].filter(field=>root!==form||!field.closest('[data-gd-execution-row]')).map(field=>field.tagName==='SELECT'?[...field.selectedOptions].map(option=>option.value):field.value.trim());
 const rows=[...form.querySelectorAll('[data-gd-execution-row]')].map(values).filter(row=>row.some(value=>Array.isArray(value)?value.some(Boolean):!!value));
 return JSON.stringify([values(form),rows]);
}
function gdBindTaskEntryClose(dialog){
 const form=dialog.querySelector('form'),initial=gdTaskEntrySnapshot(form),controller=new AbortController();let confirmation=null;
 const finish=discard=>{
  if(!confirmation)return;const {node,origin}=confirmation;confirmation=null;node.close();node.remove();
  if(discard)dialog.close();else if(dialog.open&&origin?.isConnected)origin.focus({preventScroll:true});
 };
 const requestClose=()=>{
  if(confirmation)return;
  if(gdTaskEntrySnapshot(form)===initial){dialog.close();return}
  const node=document.createElement('dialog');node.className='gd-task-discard-confirm';node.setAttribute('role','alertdialog');node.setAttribute('aria-labelledby','gd-task-discard-title');node.setAttribute('aria-describedby','gd-task-discard-message');
  node.innerHTML='<header><h3 id="gd-task-discard-title">提醒</h3><button type="button" class="gd-task-discard-close" data-gd-discard-close aria-label="关闭提醒">×</button></header><p id="gd-task-discard-message"><span class="gd-task-discard-icon" aria-hidden="true">!</span><span>关闭后不保存已编辑数据，请确认是否关闭？</span></p><footer><button type="button" class="btn" data-gd-discard-cancel autofocus>取消</button><button type="button" class="btn primary" data-gd-discard-confirm>确定</button></footer>';
  confirmation={node,origin:document.activeElement};document.body.append(node);
  node.querySelector('[data-gd-discard-close]').onclick=()=>finish(false);node.querySelector('[data-gd-discard-cancel]').onclick=()=>finish(false);node.querySelector('[data-gd-discard-confirm]').onclick=()=>finish(true);
  node.addEventListener('cancel',event=>{event.preventDefault();finish(false)});node.showModal();
 };
 dialog.querySelectorAll('[data-gd-entry-close]').forEach(button=>button.onclick=requestClose);
 dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose()},{signal:controller.signal});
 // 只有从遮罩开始并在遮罩结束的点击才关闭，避免拖动输入内容时误触。
 const outside=event=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)};
 let outsideDown=false;dialog.addEventListener('pointerdown',event=>{outsideDown=outside(event)},{signal:controller.signal});
 dialog.addEventListener('click',event=>{if(outsideDown&&outside(event))requestClose();outsideDown=false},{signal:controller.signal});
 dialog.addEventListener('close',()=>{finish(false);controller.abort()},{once:true});
}
