// 历史只保存批次信息及失败行单元格，不保存原文件或成功行内容。
const UI_IMPORT_HISTORY='dashboard-import-history-v1';
let uiImportMemory=[];
function uiImportSaved(){try{const rows=JSON.parse(localStorage.getItem(UI_IMPORT_HISTORY));return Array.isArray(rows)?rows.filter(row=>row&&typeof row.id==='string'&&typeof row.module==='string'&&typeof row.file==='string'&&Number.isFinite(Date.parse(row.at))):[]}catch(_){return []}}
function uiRecordImport(inputId,result={}){
 const input=typeof inputId==='string'?document.getElementById(inputId):inputId;
 const file=input?.files?.[0],module=result.module||input?.dataset.uploadModule||uiUploadModules[input?.id]||(input?.hasAttribute('data-gd-task-file')?'任务':'');
 if(!module||!file)return;
 const source=uiImportSource(result.table),errors=(result.errors||[]).map(row=>({row:row.row??'—',field:row.field||'',message:row.message||String(row)}));
 const failed=errors.length>0,total=result.table?source.rows.length:result.rows||0,failedRows=failed?uiImportFailureRows(source,errors):[];
 const entry={id:crypto.randomUUID(),module,file:file.name,at:new Date().toISOString(),actor:'管理员',status:failed?'导入失败':'导入成功',rows:total,
  totalRows:total,successCount:failed?0:total,failureCount:result.failureSheets?.length?result.failureSheets.reduce((sum,sheet)=>sum+sheet.rows.length,0):failedRows.length,skippedCount:source.skipped,
  errors,headers:source.headers,failedRows,changes:[],...(Array.isArray(result.failureSheets)?{failureSheets:result.failureSheets}:{}),...(Array.isArray(result.coverageMonths)?{coverageMonths:result.coverageMonths}:{}),...(Array.isArray(result.coverageYears)?{coverageYears:result.coverageYears.filter(year=>/^\d{4}$/.test(year))}:{})};
 const previous=new Map([...uiImportSaved(),...uiImportMemory].map(row=>[row.id,row]));
 const saved=[entry,...previous.values()].slice(0,500);uiImportMemory=saved;
 // 保留最新批次的完整失败数据；空间不足时先淘汰最早记录，不截断当前失败行。
 while(saved.length){try{localStorage.setItem(UI_IMPORT_HISTORY,JSON.stringify(saved));uiImportMemory=saved;return entry}catch(_){if(saved.length===1)break;saved.pop()}}
 setTimeout(()=>toast('导入记录暂存于当前页面，刷新后可能丢失'),0);return entry;
}
function uiImportHistoryRows(module){
 const records=new Map([...uiImportSaved(),...uiImportMemory].map(row=>[row.id,row]));
 // 生命周期已有完整审计台账，直接读取，不重复写一份。
 if(module==='生命周期目标')for(const row of ltStore.history.filter(row=>row.kind!=='manual'&&row.year===uiHistoryState.year)){if([...records.values()].some(item=>item.module===module&&item.file===row.file&&Math.abs(new Date(item.at)-new Date(row.at))<2000))continue;records.set('lt:'+row.id,{id:'lt:'+row.id,module,file:row.file,at:row.at,actor:row.actor,status:row.status,rows:row.rows,errors:row.errors,changes:row.changes.map(change=>({item:[ltCategories[change.category],ltPlans[change.plan]?.name,'Q'+(change.quarter+1)].join(' / '),before:change.before,after:change.after}))});}
 // 成本预警原台账继续可查；有新统一记录时不重复显示。
 if(module==='成本预警')for(const row of cwStore.batches){
  if([...records.values()].some(item=>item.module===module&&item.file===row.file&&Math.abs(new Date(item.at)-new Date(row.at))<2000))continue;
  records.set('cw:'+row.at+':'+row.file,{id:'cw:'+row.at+':'+row.file,module,file:row.file,at:row.at,actor:'管理员',status:'导入成功',rows:row.added+row.updated,errors:[],changes:[{item:'新增',after:row.added},{item:'更新',after:row.updated}]});
 }
 return [...records.values()].filter(row=>row.module===module).sort((a,b)=>new Date(b.at)-new Date(a.at));
}
for(const [id,module] of [['klc-import','核心链接']]){
 const origin=document.getElementById(id);if(!origin)continue;
 const button=document.createElement('button');button.type='button';button.className='link';button.textContent='导入记录';button.dataset.uiImportHistory=module;origin.parentElement.append(button);
}
