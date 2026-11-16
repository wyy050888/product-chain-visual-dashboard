// 公共流程只管理文件与结果；各业务提供校验和原子提交，避免预览阶段写入。
function uiBindImportFlow({dialog,input,button,parse,commit,done,read=cwReadFile,review=null,historyMeta=()=>({})}){
 dialog.removeAttribute('data-ui-import-prepared');dialog.removeAttribute('aria-busy');uiUploadEnhance(dialog);input.multiple=false;
 const feedback=document.createElement('div');feedback.className='ui-import-feedback';feedback.setAttribute('aria-live','polite');
 input.closest('.ui-upload-field').after(feedback);
 let generation=0,busy=false;
 let closing=false;
 const requestClose=event=>{
  if(closing||(!busy&&!input.files.length))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(document.querySelector('[data-upload-cancel-confirm]'))return;
  const confirm=document.createElement('dialog');confirm.className='gd-task-discard-confirm';confirm.setAttribute('data-upload-cancel-confirm','');
  confirm.innerHTML='<header><h3>取消上传</h3></header><p>关闭后取消上传文件，请确认是否关闭？</p><footer><button type="button" class="btn" data-stay>取消</button><button type="button" class="btn primary" data-leave>确认</button></footer>';
  confirm.querySelector('[data-stay]').onclick=()=>confirm.close();
  confirm.querySelector('[data-leave]').onclick=()=>{closing=true;generation++;input.value='';confirm.close();dialog.close()};
  confirm.addEventListener('close',()=>confirm.remove(),{once:true});document.body.append(confirm);confirm.showModal();
 };
 dialog.addEventListener('cancel',requestClose);
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-gd-entry-close], [data-ui-import-close], .ui-import-close'))requestClose(event)},true);

 const reset=()=>{generation++;feedback.replaceChildren();feedback.classList.remove('is-error');button.disabled=!input.files.length;button.textContent='确认导入'};
 input.addEventListener('change',reset);dialog.addEventListener('close',()=>generation++,{once:true});reset();
 const run=async event=>{
  event.preventDefault();if(busy||!input.files.length)return;
  const file=input.files[0],ticket=++generation,config=uiUploadOptions(input);let table,entry,batch,sheetName,saving=false;
  busy=true;button.disabled=true;button.textContent='导入中…';input.disabled=true;dialog.setAttribute('aria-busy','true');feedback.textContent='';feedback.classList.remove('is-error');
  // 先让按钮和加载态绘制，再读取、校验与保存；重复点击不会生成重复批次。
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  const current=()=>ticket===generation&&document.contains(input)&&input.files[0]===file&&(dialog.tagName==='DIALOG'?dialog.open:!dialog.closest('#overlay')?.hidden);
  try{
   if(file.size>config.limit)throw Error('文件不能超过5MB');
   if(!uiUploadAccepts(input,file))throw Error('请选择 .xlsx 或 .csv 文件');
   table=await read(file);if(!current())return;
   batch=await parse(table,file);if(!current())return;
   sheetName=table.sheetName;
   table=batch.sourceTable||table;
   if(batch.errors?.length){entry=uiRecordImport(input,{status:'导入失败',errors:batch.errors,table,sheetName,...historyMeta(batch)});}
   else{
    if(review&&!await review(batch,file))return;if(!current())return;
    saving=true;await commit(batch,file);if(!current())return;
    entry=uiRecordImport(input,{status:'导入成功',table,...historyMeta(batch)});
    done(batch);toast('导入成功，共 '+(entry?.successCount??0)+' 条');return;
   }
  }catch(error){
   if(!current())return;
   const message=saving?'保存失败，本批数据未导入，请重试':error.message||'导入失败，请重试';
   entry=uiRecordImport(input,{errors:[{row:'—',message}],table,sheetName,saveFailed:saving,...(batch?historyMeta(batch):{})});
  }
  finally{busy=false;input.disabled=false;if(document.contains(input))dialog.removeAttribute('aria-busy');if(current()){button.disabled=false;button.textContent='确认导入'}}
  if(!current())return;
  feedback.classList.add('is-error');
  const text=document.createElement('span');text.textContent=saving?'保存失败，本批数据未导入，请重试。':'导入失败，未保存数据。'+(entry?.totalRows>0?(entry.invalidRows?'校验错误 '+entry.invalidRows+' 行，':'')+'本批 '+entry.totalRows+' 行均未导入。':'');feedback.append(text);
  if(entry){
   const action=(label,handler)=>{const control=document.createElement('button');control.type='button';control.className='link';control.textContent=label;control.onclick=handler;feedback.append(control)};
   action('查看失败明细',()=>uiImportHistory(entry.module,entry.id));
   action('下载失败报告',()=>uiHistoryDownload(entry));
  }
 };
 button.addEventListener('click',run);
 dialog.querySelector('form')?.addEventListener('submit',run);
}

function uiImportSource(table=[]){
 const headers=(table[0]||[]).map(value=>String(value??''));
 const rows=table.slice(1).flatMap((row,index)=>row.some(value=>String(value??'').trim())?[{row:row.sourceRow||index+2,values:Array.from({length:Math.max(headers.length,row.length)},(_,column)=>String(row[column]??''))}]:[]);
 return {headers,headerRow:table[0]?.sourceRow||1,rows,skipped:table.length?table.length-1-rows.length:0};
}
function uiImportFailures(source,sheets,errors,saveFailed){
 const byRow=new Map();
 for(const error of errors){const key=String(error.row);if(!byRow.has(key))byRow.set(key,[]);byRow.get(key).push(error)}
 const used=new Set();
 const annotate=(rows,prefix)=>rows.map(row=>{
  const key=prefix+row.row,issues=byRow.get(key)||[];
  if(issues.length)used.add(key);
  return {...row,issues,result:issues.length?'校验失败':'未导入',reason:issues.length?issues.map(({field,message})=>field?field+'：'+message:message).join('\n'):uiFailurePending};
 });
 const failureSheets=sheets?.map(sheet=>({...sheet,rows:annotate(sheet.rows,sheet.name+'!')}));
 const failedRows=failureSheets?[]:annotate(source.rows,'');
 const fileIssues=errors.filter(error=>!used.has(String(error.row)));
 for(const [name,rows]of failureSheets?failureSheets.map(sheet=>[sheet.name,sheet.rows]):[['',failedRows]]){
  const blocking=fileIssues.filter(error=>!name||String(error.row).startsWith(name+'!')||error.row==='—');
  if(!blocking.length)continue;
  const blockedReason=saveFailed?'本行校验通过，因保存失败未导入':'因文件级错误未导入\n'+blocking.map(error=>(error.field?error.field+'：':'')+error.message).join('\n');
  for(const row of rows)if(!row.issues.length)row.reason=blockedReason;
 }
 return {failedRows,failureSheets,fileIssues,invalidRows:used.size};
}
