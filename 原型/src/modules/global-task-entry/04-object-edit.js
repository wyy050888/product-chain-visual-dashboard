// 手工任务修改关联只改当前身份，不改任务ID、执行项、办理信息和原始来源依据。
function gdSaveTaskObject(taskId,values,catalog){
 const task=upTodos[taskId];if(!task?.gdManualEntry||task.deletedAt)throw Error('任务不可修改');
 const object=gdTaskResolveObject(values.objectType,values.objectReference,catalog);
 const category=object?.type==='shop'?'':object?.category||String(values.category||'');
 if(category&&!pfCategories.includes(category))throw Error('请选择有效链群');
 const association=gdTaskAssociation(object,category,task.id),now=new Date().toISOString();
 if(JSON.stringify([task.businessObjects,task.gdCategory])===JSON.stringify([association.businessObjects,category]))return task;
 const next={...task,...association,updatedAt:now,logs:[...task.logs,{at:now,actor:upTodoCurrentUser,action:'business-object-update',previous:task.businessObjects||[],next:association.businessObjects,previousCategory:task.gdCategory||'',category}]};
 const tasks={...upTodos,[taskId]:next};gdStoreManualTasks(tasks);upPersistTodos(tasks);return upTodos[taskId];
}
function gdMountTaskObjectEdit(dialog,task,onSaved){
 const heading=dialog.querySelector('.up-todo-detail-heading'),body=dialog.querySelector('#up-todo-panel-detail');if(!heading||!body)return;
 const catalog=gdTaskObjectCatalog(),association=task.businessObjects?.[0],initial=catalog.find(object=>object.type===association?.type&&object.id===String(association.id));
 const section=document.createElement('section');section.className='gd-task-object-edit';
 const objects=upTodoHeadingObjects(task),current=objects.map(object=>(['product','project','shop'].includes(object.type)?diagnosisObjectTag(object.type,true):'')+'<span>'+esc(object.name)+'</span>').join('、');
 section.innerHTML='<div class="gd-task-object-current"><span>业务对象</span><div>'+current+'</div><button type="button" class="link" data-gd-object-edit>修改</button></div>';
 body.prepend(section);let picker=null,editor=null;
 const cancel=()=>{if(!editor)return false;picker?.destroy();picker=null;editor.remove();editor=null;section.querySelector('[data-gd-object-edit]').setAttribute('aria-expanded','false');return true};
 const button=section.querySelector('[data-gd-object-edit]');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','修改业务对象');
 button.onclick=()=>{
  if(editor){cancel();return}if(dialog.upFlushInline?.()===false)return;
  const options=rows=>rows.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');
  editor=document.createElement('div');editor.className='gd-task-object-editor';
  editor.innerHTML='<div class="gd-task-object-edit-fields"><label>业务对象类型<select name="objectType" aria-label="业务对象类型">'+options([['','未关联'],['product','产品'],['project','项目'],['shop','店铺']])+'</select></label><label><span class="gd-task-field-label">业务对象<span class="gd-task-required" aria-hidden="true" hidden>*</span></span>'+gdTaskObjectPickerMarkup()+'</label><label data-gd-task-chain>链群<select name="category" aria-label="链群">'+options([['','未指定'],...pfCategories.map(value=>[value,value])])+'</select></label></div><p class="gd-task-entry-error" role="alert"></p><div class="gd-task-object-edit-actions"><button type="button" class="btn" data-gd-object-cancel>取消</button><button type="button" class="btn primary" data-gd-object-save>保存业务对象</button></div>';
  section.append(editor);picker=gdBindTaskObjectPicker(editor,catalog,initial);if(!initial)editor.querySelector('[name=category]').value=task.gdCategory||'';button.setAttribute('aria-expanded','true');
  const required=()=>{editor.querySelector('.gd-task-required').hidden=!editor.querySelector('[name=objectReference]').required};editor.querySelector('[name=objectType]').addEventListener('change',required);required();
  editor.querySelector('[data-gd-object-cancel]').onclick=()=>{cancel();button.focus()};
  editor.querySelector('[data-gd-object-save]').onclick=()=>{
   const error=editor.querySelector('[role=alert]');error.textContent='';
   try{
    for(const field of editor.querySelectorAll('input,select'))if(!field.checkValidity()){field.reportValidity();return}
    const saved=gdSaveTaskObject(task.id,{objectType:editor.querySelector('[name=objectType]').value,objectReference:picker.reference(),category:editor.querySelector('[name=category]').value},catalog);
    cancel();onSaved(saved);toast('业务对象已更新');
   }catch(reason){error.textContent=reason.message}
  };
 };
 dialog.upCancelObjectEdit=()=>{if(editor?.querySelector('[role=listbox]:popover-open')){picker.close();return true}return cancel()};
 dialog.upObjectEditCleanup=()=>{cancel();section.remove();dialog.upCancelObjectEdit=null;dialog.upObjectEditCleanup=null};
}
