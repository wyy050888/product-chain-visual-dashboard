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
  const file=input.files[0],ticket=++generation,config=uiUploadOptions(input);let table=[],entry;
  busy=true;button.disabled=true;button.textContent='导入中…';input.disabled=true;dialog.setAttribute('aria-busy','true');feedback.textContent='';feedback.classList.remove('is-error');
  // 先让按钮和加载态绘制，再读取、校验与保存；重复点击不会生成重复批次。
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  const current=()=>ticket===generation&&document.contains(input)&&input.files[0]===file&&(dialog.tagName==='DIALOG'?dialog.open:!dialog.closest('#overlay')?.hidden);
  try{
   if(file.size>config.limit)throw Error('文件不能超过5MB');
   if(!uiUploadAccepts(input,file))throw Error('请选择 .xlsx 或 .csv 文件');
   table=await read(file);if(!current())return;
   const batch=await parse(table,file);if(!current())return;
   table=batch.sourceTable||table;
   if(batch.errors?.length){entry=uiRecordImport(input,{status:'导入失败',errors:batch.errors,table,...historyMeta(batch)});}
   else{
    if(review&&!await review(batch,file))return;if(!current())return;
    await commit(batch,file);if(!current())return;
    entry=uiRecordImport(input,{status:'导入成功',table,...historyMeta(batch)});
    done(batch);toast('导入成功，共 '+(entry?.successCount??0)+' 条');return;
   }
  }catch(error){if(!current())return;table=Array.isArray(table)?table:[];entry=uiRecordImport(input,{status:'导入失败',errors:[{row:'—',message:error.message||'导入失败，请重试'}],table});}
  finally{busy=false;input.disabled=false;if(document.contains(input))dialog.removeAttribute('aria-busy');if(current()){button.disabled=false;button.textContent='确认导入'}}
  if(!current())return;
  feedback.classList.add('is-error');
  const text=document.createElement('span');text.textContent='导入失败，未保存数据。移除文件后可重新上传。';feedback.append(text);
  if(entry){const detail=document.createElement('button');detail.type='button';detail.className='link';detail.textContent='查看失败明细';detail.onclick=()=>uiImportHistory(entry.module,entry.id);feedback.append(detail)}
 };
 button.addEventListener('click',run);
 dialog.querySelector('form')?.addEventListener('submit',run);
}

// 只存失败行的原始单元格，供明细和下载使用；示例、空行不计入总行数。
function uiImportSource(table=[]){
 const headers=(table[0]||[]).map(value=>String(value??''));
 const rows=table.slice(1).filter(row=>row.some(value=>String(value??'').trim())).map((row,index)=>({row:row.sourceRow||index+2,values:Array.from({length:Math.max(headers.length,row.length)},(_,column)=>String(row[column]??''))}));
 const skipped=table.slice(1).filter(row=>!row.some(value=>String(value??'').trim())).length;
 return {headers,rows,skipped};
}
function uiImportFailureRows(source,errors){
 const byRow=new Map(),general=[],rowNumbers=new Set(source.rows.map(row=>String(row.row)));
 for(const error of errors){const message=(error.field?error.field+'：':'')+error.message,key=String(error.row);if(rowNumbers.has(key)){if(!byRow.has(key))byRow.set(key,[]);byRow.get(key).push(message)}else general.push(message)}
 // 公共流程整批失败时没有任何成功行；其他行保留原值并说明未导入，避免失败数少算。
 const failed=source.rows.map(row=>{const reasons=[...(byRow.get(String(row.row))||[]),...general];return {...row,reason:reasons.length?[...new Set(reasons)].join('；'):'同批文件含错误，本行未导入'}});
 if(general.length&&!source.rows.length)failed.push({row:'—',values:[],reason:[...new Set(general)].join('；')});
 return failed;
}
