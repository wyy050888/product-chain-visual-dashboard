// 公共流程只管理文件与结果；各业务提供校验和原子提交，避免预览阶段写入。
function uiBindImportFlow({dialog,input,button,parse,commit,done,read=cwReadFile,historyMeta=()=>({})}){
 dialog.removeAttribute('data-ui-import-prepared');dialog.removeAttribute('aria-busy');uiUploadEnhance(dialog);input.multiple=false;
 const feedback=document.createElement('div');feedback.className='ui-import-feedback';feedback.setAttribute('aria-live','polite');
 input.closest('.ui-upload-field').after(feedback);
 let generation=0,busy=false;
 const reset=()=>{generation++;feedback.replaceChildren();feedback.classList.remove('is-error');button.disabled=!input.files.length;button.textContent='确认导入'};
 input.addEventListener('change',reset);dialog.addEventListener('close',()=>generation++,{once:true});reset();
 const run=async event=>{
  event.preventDefault();if(busy||!input.files.length)return;
  const file=input.files[0],ticket=++generation,config=uiUploadOptions(input);let table=[],entry;
  busy=true;button.disabled=true;button.textContent='导入中…';input.disabled=true;dialog.setAttribute('aria-busy','true');feedback.textContent='';
  // 先让按钮和加载态绘制，再读取、校验与保存；重复点击不会生成重复批次。
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  const current=()=>ticket===generation&&document.contains(input)&&input.files[0]===file&&(dialog.tagName==='DIALOG'?dialog.open:!dialog.closest('#overlay')?.hidden);
  try{
   if(file.size>config.limit)throw Error('文件不能超过5MB');
   if(!uiUploadAccepts(input,file))throw Error('请选择 .xlsx 或 .csv 文件');
   table=await read(file);if(!current())return;
   const batch=await parse(table,file);if(!current())return;
   if(batch.errors?.length){entry=uiRecordImport(input,{status:'导入失败',errors:batch.errors,table});}
   else{
    await commit(batch,file);if(!current())return;
    entry=uiRecordImport(input,{status:'导入成功',table,...historyMeta(batch)});
    done(batch);toast('导入成功，共 '+(entry?.successCount??0)+' 条');return;
   }
  }catch(error){if(!current())return;entry=uiRecordImport(input,{status:'导入失败',errors:[{row:'—',message:error.message||'导入失败，请重试'}],table});}
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
 // 整批保存：其他有效行也未保存，明确其失败原因，避免误以为已经成功。
 const failed=source.rows.map(row=>({...row,reason:[...new Set([...(byRow.get(String(row.row))||[]),...general])].join('；')||'同批文件含错误，本行未导入'}));
 return failed.length?failed:[{row:'—',values:[],reason:[...new Set(errors.map(error=>(error.field?error.field+'：':'')+error.message))].join('；')}];
}
