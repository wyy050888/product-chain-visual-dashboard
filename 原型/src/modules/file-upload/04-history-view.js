const uiImportHistoryDialog=document.createElement('dialog');uiImportHistoryDialog.id='ui-import-history';uiImportHistoryDialog.className='ui-import-modal ui-import-history';document.body.append(uiImportHistoryDialog);
const uiHistoryState={module:'',year:null,query:'',page:1,entry:null,detailPage:1};
function uiImportHistory(module,entryId=''){
 Object.assign(uiHistoryState,{module,year:module==='生命周期目标'?ltEditor.year:null,query:'',page:1,entry:null,detailPage:1});
 uiHistoryState.entry=entryId?uiImportHistoryRows(module).find(row=>row.id===entryId):null;
 uiImportHistoryDialog.innerHTML='<header><h2></h2><button type="button" class="ui-history-close" data-ui-history-close aria-label="关闭">×</button></header><div class="ui-history-body"><div class="ui-history-toolbar"><label class="ui-search-field"><input type="search" placeholder="搜索文件名" aria-label="搜索导入文件" data-ui-history-query></label></div><div data-ui-history-content></div><div data-ui-history-pages></div></div><footer><button type="button" class="btn" data-ui-history-close>关闭</button></footer>';
 uiRenderImportHistory();if(!uiImportHistoryDialog.open)uiImportHistoryDialog.showModal();
}
function uiHistoryTable(headers,rows){return '<div class="ui-history-table"><table><thead><tr>'+headers.map(label=>'<th>'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'" class="empty">暂无导入记录</td></tr>')+'</tbody></table></div>'}
function uiHistoryCounts(entry){
 const failed=entry.errors?.length>0||/失败/.test(entry.status),success=entry.successCount??(failed?0:entry.rows||0),failure=entry.failureCount??(failed?entry.rows||0:0);
 return {total:entry.totalRows??entry.rows??0,success,failure,skipped:entry.skippedCount||0,failed,status:failed?(success?'部分失败':'导入失败'):'导入成功'};
}
function uiHistoryFailedRows(entry){return entry.failedRows?.length?entry.failedRows:(entry.errors||[]).map(row=>({row:row.row,values:[],reason:(row.field?row.field+'：':'')+row.message}))}
function uiHistoryDownload(entry){
 downloadCsv(['原始行号',...(entry.headers||[]),'失败原因'],uiHistoryFailedRows(entry).map(row=>[row.row,...Array.from({length:entry.headers?.length||0},(_,index)=>row.values[index]||''),row.reason]),entry.file.replace(/\.[^.]+$/,'')+'-失败数据');
}
function uiRenderImportHistory(){
 const state=uiHistoryState,entry=state.entry,content=uiImportHistoryDialog.querySelector('[data-ui-history-content]'),pages=uiImportHistoryDialog.querySelector('[data-ui-history-pages]');
 uiImportHistoryDialog.querySelector('h2').textContent=entry?'失败明细（批次 '+entry.id.replace(/^(lt:|cw:)/,'').slice(0,8)+'）':state.module+' · 导入记录';
 uiImportHistoryDialog.querySelector('.ui-history-toolbar').hidden=!!entry;
 uiImportHistoryDialog.classList.toggle('is-failure-detail',!!entry);
 const time=value=>new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
 if(entry){
  const counts=uiHistoryCounts(entry),rows=uiHistoryFailedRows(entry),size=listPageSize('ui-import-failure-pages',20);
  state.detailPage=Math.max(1,Math.min(state.detailPage,Math.ceil(rows.length/size)||1));
  content.innerHTML='<div class="ui-history-detail-head"><button type="button" class="link" data-ui-history-back>‹ 返回记录</button><span class="ui-history-status is-error">'+counts.status+'</span><span>成功 '+fmt(counts.success)+' / 失败 '+fmt(counts.failure)+'</span><button type="button" class="btn" data-ui-history-errors>↓ 下载失败数据</button></div>'+uiHistoryTable(['原始行号',...(entry.headers||[]),'失败原因'],rows.slice((state.detailPage-1)*size,state.detailPage*size).map(row=>[esc(row.row),...Array.from({length:entry.headers?.length||0},(_,index)=>esc(row.values[index]||'—')),esc(row.reason)]));
  pages.id='ui-import-failure-pages';pages.innerHTML=listPager(rows.length,state.detailPage,size);bindListPager(pages,page=>{state.detailPage=page;uiRenderImportHistory()});return;
 }
 const rows=uiImportHistoryRows(state.module).filter(row=>row.file.toLowerCase().includes(state.query.toLowerCase())),size=listPageSize('ui-import-history-pages',10);
 state.page=Math.max(1,Math.min(state.page,Math.ceil(rows.length/size)||1));
 content.innerHTML=uiHistoryTable(['导入时间','文件名','操作人','总行数','成功数','失败数','状态','备注','操作'],rows.slice((state.page-1)*size,state.page*size).map(row=>{
  const counts=uiHistoryCounts(row),actions=counts.failed?'<button type="button" class="link" data-ui-history-detail="'+esc(row.id)+'">查看失败明细</button><button type="button" class="link" data-ui-history-download="'+esc(row.id)+'">下载失败数据</button>':'—';
  return [time(row.at),esc(row.file),esc(row.actor),fmt(counts.total),fmt(counts.success),fmt(counts.failure),'<span class="ui-history-status'+(counts.failed?' is-error':'')+'">'+counts.status+'</span>','成功 '+fmt(counts.success)+' 条，失败 '+fmt(counts.failure)+' 条，跳过空行 '+fmt(counts.skipped)+' 条'+(row.coverageYears?.length?'；覆盖年份：'+row.coverageYears.map(year=>esc(year)+'年').join('、'):''),actions];
 }));
 pages.id='ui-import-history-pages';pages.innerHTML=listPager(rows.length,state.page,size);bindListPager(pages,page=>{state.page=page;uiRenderImportHistory()});
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-ui-import-history]');if(button)uiImportHistory(button.dataset.uiImportHistory)});
uiImportHistoryDialog.addEventListener('input',event=>{if(event.target.matches('[data-ui-history-query]')){uiHistoryState.query=event.target.value;uiHistoryState.page=1;uiRenderImportHistory()}});
uiImportHistoryDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-ui-history-close]'))return uiImportHistoryDialog.close();
 if(event.target.closest('[data-ui-history-back]')){uiHistoryState.entry=null;uiRenderImportHistory()}
 const detail=event.target.closest('[data-ui-history-detail]');if(detail){uiHistoryState.entry=uiImportHistoryRows(uiHistoryState.module).find(row=>row.id===detail.dataset.uiHistoryDetail);uiHistoryState.detailPage=1;uiRenderImportHistory()}
 const download=event.target.closest('[data-ui-history-download]');if(download){const row=uiImportHistoryRows(uiHistoryState.module).find(row=>row.id===download.dataset.uiHistoryDownload);if(row)uiHistoryDownload(row)}
 if(event.target.closest('[data-ui-history-errors]')&&uiHistoryState.entry)uiHistoryDownload(uiHistoryState.entry);
});
