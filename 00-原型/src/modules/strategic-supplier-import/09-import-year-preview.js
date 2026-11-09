// 选文件时只解析年份；确认导入才写入，替换文件或关闭后丢弃旧解析结果。
function ssiBindAnnualImport(dialog,tier){
 const input=$('#ssi-file'),button=$('#ssi-confirm'),note=dialog.querySelector('.ssi-import-coverage');let prepared=null,generation=0;
 uiBindImportFlow({dialog,input,button,
  read:file=>prepared?.file===file?prepared.table:ssiReadFile(file,tier),
  parse:table=>prepared?.file===input.files[0]?prepared.batch:ssiParseImport(table,tier),commit:ssiCommit,
  historyMeta:batch=>({coverageYears:batch.years||[]}),
  done:()=>{dialog.close();ssiRenderPage()}
 });
 input.addEventListener('change',async()=>{
  const ticket=++generation,file=input.files[0];prepared=null;note.textContent=ssiImportCoverageText(tier);if(!file)return;
  button.disabled=true;
  try{
   const config=uiUploadOptions(input);if(file.size>config.limit)throw Error('文件不能超过5MB');if(!uiUploadAccepts(input,file))throw Error('请选择 .xlsx 或 .csv 文件');
   const table=await ssiReadFile(file,tier),batch=ssiParseImport(table,tier);
   if(ticket!==generation||!dialog.open||input.files[0]!==file)return;
   prepared={file,table,batch};note.textContent=batch.errors.length?'文件校验未通过，尚未执行覆盖；确认导入后可查看失败明细。':ssiImportCoverageText(tier,batch.years);
  }catch(error){if(ticket===generation&&dialog.open)note.textContent=error.message+'；尚未执行覆盖。'}
  finally{if(ticket===generation&&dialog.open&&input.files[0]===file)button.disabled=false}
 });
 dialog.addEventListener('close',()=>{generation++;prepared=null},{once:true});
}
