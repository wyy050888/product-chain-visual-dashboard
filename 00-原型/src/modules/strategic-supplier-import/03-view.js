function ssiFieldMarkup(key,row){return key.endsWith('Rating')&&row[key]?`<span class="ssi-rating" data-ssi-rating="${esc(row[key])}">${esc(row[key])}</span>`:esc(row[key]||'—')}
smRegisterPage({route:ssiRoute,id:'ssi-page',title:'供应商导入',menuTitle:'供应商导入',group:'业务配置',menuOrder:20,
 markup:`<header class="lt-page-head"><h2 class="sm-page-title">供应商导入</h2><div class="ssi-tabs" role="tablist" aria-label="供应商类型">${Object.entries(ssiTierLabels).map(([key,label])=>`<button type="button" role="tab" data-ssi-tier="${key}" aria-selected="${ssiState.tier===key}">${label}</button>`).join('')}</div></header><section class="lt-panel"><div class="ssi-toolbar ui-business-filters"><label class="ui-search-field"><input id="ssi-query" type="search" aria-label="搜索供应商关系" placeholder="搜索供应商 / 产品名称 / SPU码"></label><label class="unified-input-group ssi-year-field"><span class="unified-field-name">年份</span><select id="ssi-year" aria-label="合作年份"></select></label>${ssiCatalogFiltersMarkup()}<button type="button" class="link" id="ssi-reset">重置</button></div><div class="ssi-actions">${smDataAction('import','导入','id="ssi-import"')}${smDataAction('download','下载模板','id="ssi-template"')}${smDataAction('export','导出','id="ssi-export"')}<button type="button" class="link" id="ssi-history">导入记录</button></div><div class="cec-table-scroll"><table class="cec-table ssi-table"><thead id="ssi-head"></thead><tbody id="ssi-body"></tbody></table></div><div id="ssi-pagination"></div></section>`,onShow(){ssiRenderPage()}});
const ssiDialog=document.createElement('dialog');ssiDialog.id='ssi-import-dialog';ssiDialog.className='cec-dialog cec-import-dialog';ssiDialog.setAttribute('aria-labelledby','ssi-import-title');document.body.append(ssiDialog);
function ssiRenderPage(){
 const state=ssiViewState();$('#ssi-query').value=state.query;
 for(const tab of document.querySelectorAll('[data-ssi-tier]'))tab.setAttribute('aria-selected',String(tab.dataset.ssiTier===ssiState.tier));
 ssiSyncYear();ssiSyncCatalogFilters();decorateFilterFields($('#ssi-page .ssi-toolbar'));ssiRenderTable();
}
function ssiRenderTable(){
 const state=ssiViewState(),rows=ssiRows(),columns=[...ssiListFields(),['actions','操作']],size=listPageSize('ssi-pagination',20);state.page=Math.max(1,Math.min(state.page,Math.ceil(rows.length/size)||1));
 ssiSetColumnWidths($('#ssi-page .ssi-table'),columns);
 $('#ssi-head').innerHTML='<tr>'+columns.map(([key,label])=>`<th data-ssi-field="${key}">${ssiSortHeading(key,label,state.sort)}</th>`).join('')+'</tr>';
 rpApplySortAria($('#ssi-head'),state.sort);
 $('#ssi-body').innerHTML=rows.slice((state.page-1)*size,state.page*size).map(row=>`<tr data-ssi-key="${esc(ssiKey(row))}">${columns.map(([key])=>`<td data-ssi-field="${key}"${['actor','updatedAt','actions'].includes(key)?' class="ssi-'+key+'"':''}>${ssiListFieldMarkup(key,row)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}" class="empty">${state.year!=='all'||state.query||ssiCategoryIds(state.category).length||pfSelected(state.brand).length||pfSelected(state.material).length?'没有符合筛选条件的数据':'暂无数据'}</td></tr>`;
 const pager=$('#ssi-pagination');pager.innerHTML=listPager(rows.length,state.page,size);bindListPager(pager,page=>{state.page=page;ssiRenderTable()});
}
function ssiOpenImport(){
 const tier=ssiState.tier,label=ssiTierLabels[tier];uiUploadModules['ssi-file']=label;
 ssiDialog.innerHTML=`<header><h2 id="ssi-import-title">导入${label}</h2><button type="button" class="cec-close" data-ssi-close aria-label="关闭">×</button></header><div class="cec-import-body"><div class="cec-import-tools"><button type="button" class="cec-text-button" data-ssi-template="${tier}">下载模板</button></div><div class="ssi-import-coverage ui-import-coverage" role="note">${esc(ssiImportCoverageText(tier))}</div><label class="cec-upload" id="ssi-drop"><input id="ssi-file" type="file" accept=".xlsx,.csv"><span class="cec-upload-icon" aria-hidden="true">↑</span><strong>点击或拖拽文件到此处</strong><span id="ssi-filename">支持 .xlsx、.csv，最大5MB；本次只导入${label}</span></label><div id="ssi-result" aria-live="polite"></div><p id="ssi-error" role="alert"></p></div><footer><span>每行一条关系，全部通过后整批保存</span><div><button type="button" class="cec-button" data-ssi-close>取消</button><button type="button" class="cec-button primary" id="ssi-confirm" disabled>确认导入</button></div></footer>`;
 ssiDialog.showModal();ssiBindAnnualImport(ssiDialog,tier);
}
function ssiCloseImport(){if(ssiDialog.getAttribute('aria-busy')!=='true')ssiDialog.close()}
