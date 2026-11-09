// 新增、详情和导入共用单任务字段，保存后返回任务清单。
let gdTaskEntryDialog=null,gdTaskImportToken=0;
function gdTaskEntryShell(title,body,footer,drawer=false,extraClass=''){
 gdTaskEntryDialog?.close();const dialog=document.createElement('dialog');dialog.className='gd-task-entry-dialog'+(drawer?' gd-task-entry-drawer':'')+(extraClass?' '+extraClass:'');
 dialog.setAttribute('aria-labelledby','gd-task-entry-title');dialog.innerHTML=`<form novalidate><header><h3 id="gd-task-entry-title">${title}</h3><button type="button" class="gd-task-entry-close" data-gd-entry-close aria-label="关闭${title}">×</button></header><div class="gd-task-entry-body">${body}<p class="gd-task-entry-error" role="alert" data-gd-entry-error></p></div>${footer===null?'':`<footer><button type="button" class="btn" data-gd-entry-close>取消</button>${footer}</footer>`}</form>`;
 dialog.querySelectorAll('[data-gd-entry-close]').forEach(button=>button.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{gdTaskImportToken++;dialog.remove();if(gdTaskEntryDialog===dialog)gdTaskEntryDialog=null;document.querySelector('[data-gd-part="tasks"]')?.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);gdTaskEntryDialog=dialog;dialog.showModal();return dialog;
}
function gdLedgerFieldMarkup([key,label],values,display=false){
  const value=values[key]||'',required=['registrationDate','priority','title','status','primaryOwner','department','due'].includes(key);let control;
  const attrs=' name="'+key+'" aria-label="'+label+'" '+(required?'required':'');
  if(key==='status')control=gdLedgerStatusMarkup(value,!display);
  else if(key==='priority')control='<select'+attrs+'>'+Object.entries(upTodoPriorities).map(([k,v])=>'<option value="'+k+'" '+(k===value?'selected':'')+'>'+v+'</option>').join('')+'</select>';
  else if(['primaryOwner','secondaryOwner','requestor'].includes(key))control=gdTaskAssigneePickerMarkup('gd-ledger-'+key+'-options',{name:key,label,required});
  else if(key==='department')control='<select'+attrs+'><option value="">请选择部门</option>'+gdLedgerDepartments.map(name=>'<option '+(gdLedgerDepartment(value,false)===name?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select>';
  else if(key==='gdCategory')control='<select'+attrs+'>'+gdLedgerChains.map(chain=>'<option '+(gdLedgerChain(value)===chain?'selected':'')+'>'+esc(chain)+'</option>').join('')+'</select>';
  else if(['registrationDate','due','completedAt'].includes(key))control=gdTaskDatePickerMarkup({name:key,label,value,required});
  else if(['title','deliverable','latestProgress'].includes(key))control='<textarea'+attrs+' rows="3" maxlength="'+(key==='title'?120:3000)+'">'+esc(value)+'</textarea>';
  else control='<input'+attrs+' type="'+(['registrationDate','due','completedAt'].includes(key)?'date':'text')+'" value="'+esc(key==='completedAt'&&value?upTodoDate(value):value)+'" '+(!['registrationDate','due','completedAt'].includes(key)?'maxlength="120"':'')+'>';
  return '<div class="gd-ledger-field '+(display?'':'is-editing ')+(['title','deliverable','latestProgress','ledgerTaskType'].includes(key)?'gd-task-entry-wide':'')+'" data-ledger-field="'+key+'"><span class="gd-task-field-label"><span class="gd-task-required" aria-hidden="true" '+(required?'':'hidden')+'>*</span>'+label+'</span><button type="button" class="gd-ledger-display" data-ledger-display aria-label="编辑'+label+'"></button><div class="gd-ledger-edit-control">'+control+'</div></div>';
}
function gdLedgerFormMarkup(task={},creating=false){
 const values={registrationDate:aiToday(),priority:'P2',status:'pending',...task};
 return gdLedgerMainMarkup(values,creating);
}
function gdOpenManualTask(){
 const dialog=gdTaskEntryShell('新增任务',gdLedgerFormMarkup({},true),'<button type="submit" class="btn primary" data-gd-entry-save>提交</button><button type="submit" class="btn primary" data-gd-entry-next>提交并创建下一个任务</button>',true,'gd-task-create-drawer'),form=dialog.querySelector('form');
 gdBindLedgerForm(form);gdBindTaskEntryClose(dialog);
 form.onsubmit=event=>{
  event.preventDefault();const error=dialog.querySelector('[data-gd-entry-error]');error.textContent='';if(!form.reportValidity())return;
  try{
   const values=Object.fromEntries(new FormData(form));if(values.status==='done')throw Error('新建任务不能选择已完成');const task=gdLedgerPrepare({...values,completedAt:''});gdCommitManualTasks([task]);dialog.close();gdRevealManualTasks([task]);
   if(event.submitter?.hasAttribute('data-gd-entry-next')){gdOpenManualTask();gdTaskEntryDialog.querySelector('[name=title]').focus({preventScroll:true})}
   toast('任务已新增');
  }catch(e){error.textContent=e.message}
 };
}
function gdOpenTaskImport(){
 const body='<div class="gd-task-import-intro"><button type="button" class="link" data-gd-task-template>下载模板</button></div><div class="gd-task-import-coverage" role="note">按登记月份全量覆盖，包含手工新增及此前导入的任务。<br>文件中未包含的原任务删除，其他月份保留；导入失败不改原数据。</div><label class="gd-task-upload">选择任务文件<input type="file" accept=".xlsx,.csv" aria-label="选择任务文件" data-gd-task-file></label>';
 const dialog=gdTaskEntryShell('导入任务',body,'<button type="submit" class="btn primary" data-gd-task-confirm disabled>校验并导入</button>');
 dialog.querySelector('[data-gd-task-template]').onclick=gdTaskImportTemplate;
 uiBindImportFlow({dialog,input:dialog.querySelector('[data-gd-task-file]'),button:dialog.querySelector('[data-gd-task-confirm]'),parse:(table,file)=>gdParseTaskImport(table,file.name),review:gdConfirmLedgerCoverage,commit:gdReplaceLedgerMonths,done:batch=>{dialog.close();gdRevealManualTasks(batch.entries)}});
}
function gdConfirmLedgerCoverage(batch){return new Promise(resolve=>{
 const confirm=document.createElement('dialog');confirm.className='gd-task-entry-dialog';confirm.innerHTML='<header><h3>确认按月全量覆盖</h3></header><div class="gd-task-entry-body"><p>以下月份的原任务将被本文件替换，文件中未包含的任务也会删除。原变更记录不保留。</p><table class="gd-ledger-coverage"><thead><tr><th>登记月份</th><th>原任务数</th><th>导入后任务数</th></tr></thead><tbody>'+batch.coverage.map(c=>'<tr><td>'+c.month+'</td><td>'+c.oldCount+'</td><td>'+c.newCount+'</td></tr>').join('')+'</tbody></table></div><footer><button class="btn" data-cancel>取消</button><button class="btn primary" data-confirm>确认覆盖</button></footer>';
 let accepted=false;confirm.querySelector('[data-confirm]').onclick=()=>{accepted=true;confirm.close()};confirm.querySelector('[data-cancel]').onclick=()=>confirm.close();confirm.addEventListener('close',()=>{confirm.remove();resolve(accepted)},{once:true});document.body.append(confirm);confirm.showModal();
})}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-gd-task-create]'))gdOpenManualTask();
 else if(event.target.closest('[data-gd-task-import]'))gdOpenTaskImport();
});
