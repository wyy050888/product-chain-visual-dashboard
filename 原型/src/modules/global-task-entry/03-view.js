// 录入与导入均为显式入口，保存后返回任务清单；不改变既有任务详情。
let gdTaskEntryDialog=null,gdTaskImportToken=0;
function gdTaskEntryShell(title,body,footer,drawer=false){
 gdTaskEntryDialog?.close();const dialog=document.createElement('dialog');dialog.className='gd-task-entry-dialog'+(drawer?' gd-task-entry-drawer':'');
 dialog.setAttribute('aria-labelledby','gd-task-entry-title');dialog.innerHTML=`<form novalidate><header><h3 id="gd-task-entry-title">${title}</h3><button type="button" class="gd-task-entry-close" data-gd-entry-close aria-label="关闭${title}">×</button></header><div class="gd-task-entry-body">${body}<p class="gd-task-entry-error" role="alert" data-gd-entry-error></p></div><footer><button type="button" class="btn" data-gd-entry-close>取消</button>${footer}</footer></form>`;
 dialog.querySelectorAll('[data-gd-entry-close]').forEach(button=>button.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{gdTaskImportToken++;dialog.remove();if(gdTaskEntryDialog===dialog)gdTaskEntryDialog=null;document.querySelector('[data-gd-part="tasks"]')?.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);gdTaskEntryDialog=dialog;dialog.showModal();return dialog;
}
function gdOpenManualTask(){
 const catalog=gdTaskObjectCatalog(),options=(rows)=>rows.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
 const field=(label,control,attributes='')=>`<label data-gd-task-field ${attributes}><span class="gd-task-field-label">${label}<span class="gd-task-required" aria-hidden="true" hidden>*</span></span>${control}</label>`;
 const objects='<div class="gd-task-object-fields gd-task-entry-wide">'+[
  field('业务对象类型','<select name="objectType" aria-label="业务对象类型">'+options([['','请选择'],['product','产品'],['project','项目'],['shop','店铺']])+'</select>'),
  field('业务对象',gdTaskObjectPickerMarkup()),
  field('链群','<select name="category" aria-label="链群">'+options([['','未指定'],...pfCategories.map(value=>[value,value])])+'</select>','data-gd-task-chain')
 ].join('')+'</div>';
 const titleRow='<div class="gd-task-title-fields gd-task-entry-wide">'+[
  field('事项名称','<input name="title" aria-label="事项名称" required maxlength="120">'),
  field('优先级','<select name="priority" aria-label="优先级">'+options(Object.keys(upTodoPriorities).map(key=>[key,key]))+'</select>')
 ].join('')+'</div>';
 const body='<div class="gd-task-entry-grid">'+objects+titleRow
  +field('问题描述','<textarea name="description" aria-label="问题描述" required rows="3" maxlength="3000"></textarea>','class="gd-task-entry-wide"')
  +gdTaskExecutionEditorMarkup()+'</div>';
 const dialog=gdTaskEntryShell('新增任务',body,'<button type="submit" class="btn primary" data-gd-entry-save>保存任务</button>',true),form=dialog.querySelector('form');form.elements.priority.value='P2';
 const objectPicker=gdBindTaskObjectPicker(form,catalog),executions=gdBindTaskExecutionEditor(form);
 // 红星与实际校验一致：业务对象只在选定类型后必填，自动带出的链群不标必填。
 const syncRequired=()=>{for(const label of form.querySelectorAll('[data-gd-task-field]'))label.querySelector('.gd-task-required').hidden=!label.querySelector(':required:not(:disabled),[data-gd-assignee-picker]')};
 form.addEventListener('change',syncRequired);syncRequired();gdBindTaskEntryClose(dialog);
 form.onsubmit=event=>{
  event.preventDefault();const error=dialog.querySelector('[data-gd-entry-error]');error.textContent='';
  if(!form.checkValidity()){form.reportValidity();return}
  try{const task=gdPrepareManualTask({...Object.fromEntries(new FormData(form)),executions:executions.read(),objectReference:objectPicker.reference()},catalog);gdCommitManualTasks([task]);dialog.close();gdRevealManualTasks();toast('任务已新增')}catch(e){error.textContent=e.message;uiRecordImport(event.target,{status:'校验失败',errors:[{message:e.message}]})}
 };
}
function gdOpenTaskImport(){
 const body='<div class="gd-task-import-intro"><button type="button" class="link" data-gd-task-template>下载模板</button></div><label class="gd-task-upload">选择任务文件<input type="file" accept=".xlsx,.csv" aria-label="选择任务文件" data-gd-task-file></label>';
 const dialog=gdTaskEntryShell('导入任务',body,'<button type="submit" class="btn primary" data-gd-task-confirm disabled>确认导入</button>');
 dialog.querySelector('[data-gd-task-template]').onclick=gdTaskImportTemplate;
 uiBindImportFlow({dialog,input:dialog.querySelector('[data-gd-task-file]'),button:dialog.querySelector('[data-gd-task-confirm]'),parse:(table,file)=>gdParseTaskImport(table,file.name),commit:batch=>gdCommitManualTasks(batch.entries),done:()=>{dialog.close();gdRevealManualTasks()}});
}

document.addEventListener('click',event=>{
 if(event.target.closest('[data-gd-task-create]'))gdOpenManualTask();
 else if(event.target.closest('[data-gd-task-import]'))gdOpenTaskImport();
});
