const klcState={query:'',shopQuery:'',monitorMonth:'',page:1,sort:{key:'updatedAt',direction:'desc'}};
// 历史更新时间为北京时间文本，比较时明确时区；缺失时间始终置后。
function klcUpdateTime(row){
 const value=String(row.updatedAt||'').replaceAll('/','-');
 return Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value.replace(' ','T')+'+08:00':value);
}
const klcRoute='#system-core-links';
function klcShopName(id){return klcShops().find(s=>String(s.shopId)===id)?.name||id}
smRegisterPage({route:klcRoute,id:'klc-page',group:'业务配置',title:'核心链接导入',menuOrder:30,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">核心链接导入</h2><div class="sm-page-tabs" id="klc-tabs" role="tablist" aria-label="核心链接平台"><button type="button" role="tab" aria-selected="true" class="active">拼多多</button></div></header><section class="lt-panel klc-panel"><div class="ui-business-filters klc-filters"><label class="ui-search-field"><input id="klc-query" type="search" placeholder="搜索商品名称、链接ID" aria-label="搜索核心链接"></label><label class="ui-search-field"><input id="klc-shop" type="search" aria-label="搜索所属店铺" placeholder="搜索店铺名称、店铺ID"></label><div class="unified-input-group"><span class="unified-field-name">月份</span><button type="button" id="klc-month" class="klc-month-trigger" aria-label="筛选月份" aria-haspopup="dialog" aria-expanded="false" aria-controls="klc-month-panel"><span data-klc-month-value>全部月份</span><i class="ui-dropdown-icon" aria-hidden="true"></i></button></div><div id="klc-month-panel" class="nsp-period-panel ui-natural-period" popover="auto" role="dialog" aria-label="选择月份"></div><button class="link" id="klc-reset">重置</button></div><div class="klc-actions">${smDataAction('import','导入','id="klc-import"')}${smDataAction('download','下载模板','id="klc-template"')}</div><div class="klc-table-scroll"><table class="klc-table"><thead><tr>${['月份','商品信息','所属店铺','更新人','更新时间','操作'].map(x=>'<th>'+x+'</th>').join('')}</tr></thead><tbody id="klc-body"></tbody></table></div><div id="klc-pagination"></div></section>`,onShow:klcRender});
function klcRender(){
 $('#klc-month [data-klc-month-value]').textContent=klcState.monitorMonth?klcMonthLabel(klcState.monitorMonth):'全部月份';$('#klc-query').value=klcState.query;$('#klc-shop').value=klcState.shopQuery;decorateFilterFields($('#klc-page .klc-filters'));klcRenderRows();
}
function klcRenderRows(){
 const query=klcState.query.trim().toLowerCase(),shopQuery=klcState.shopQuery.trim().toLowerCase(),rows=rpSortRows(klcRows().filter(r=>(!shopQuery||[klcShopName(r.shopId),r.shopId].join(' ').toLowerCase().includes(shopQuery))&&(!klcState.monitorMonth||r.monitorMonth===klcState.monitorMonth)&&(!query||[r.name,r.linkId].join(' ').toLowerCase().includes(query))),klcState.sort,klcUpdateTime);
 const timeHeader=$('#klc-page thead th:nth-child(5)');timeHeader.innerHTML=rpSortHeader('updatedAt','更新时间',klcState.sort,undefined,{key:'updatedAt',direction:'desc'});rpApplySortAria($('#klc-page thead'),klcState.sort);
 klcState.page=Math.min(klcState.page,Math.max(1,Math.ceil(rows.length/listPageSize('klc-pagination',10))));
 $('#klc-body').innerHTML=rows.slice((klcState.page-1)*listPageSize('klc-pagination',10),klcState.page*listPageSize('klc-pagination',10)).map(r=>`<tr data-klc-row="${esc(klcKey(r))}"><td data-klc-month>${esc(klcMonthLabel(r.monitorMonth))}</td><td><strong>${esc(r.name||'--')}</strong><small>ID：${esc(r.linkId)}</small></td><td><strong>${esc(klcShopName(r.shopId))}</strong><small data-klc-shop-id>店铺ID：${esc(r.shopId)}</small></td><td>${esc(r.actor)}</td><td>${esc(r.updatedAt||'—')}</td><td class="klc-row-actions"><button data-klc-remove="${esc(klcKey(r))}">移除</button></td></tr>`).join('')||'<tr><td colspan="6" class="klc-empty">暂无核心链接</td></tr>';
 const pager=$('#klc-pagination');pager.innerHTML=listPager(rows.length,klcState.page,listPageSize('klc-pagination',10));bindListPager(pager,p=>{klcState.page=p;klcRenderRows()});
}
function klcDialog(id){const d=document.createElement('dialog');d.id=id;d.className='klc-dialog';document.body.append(d);return d}
const klcImportDialog=klcDialog('klc-import-dialog'),klcRemoveDialog=klcDialog('klc-remove-dialog');
function klcDialogContent(title,body,actions){return `<header><h2>${title}</h2><button type="button" class="klc-close" data-klc-close aria-label="关闭">×</button></header><div class="klc-dialog-body">${body}</div><footer><p class="klc-error" role="alert"></p><div><button type="button" class="klc-button" data-klc-close>取消</button>${actions}</div></footer>`}
let klcBatch=null,klcReadToken=0;
function klcOpenImport(){klcBatch=null;klcReadToken++;klcImportDialog.innerHTML=klcDialogContent('导入核心链接','<p class="klc-import-notice ui-import-coverage" role="note">导入将覆盖文件中涉及月份的全部已有数据，未列出的链接也会移除；其他月份不变。</p><label class="klc-upload">选择文件<input id="klc-file" type="file" accept=".xlsx,.csv"></label><div data-klc-preview></div>','<button class="klc-button primary" id="klc-confirm-import" disabled>确认导入</button>');klcImportDialog.showModal();
 uiBindImportFlow({dialog:klcImportDialog,input:$('#klc-file'),button:$('#klc-confirm-import'),parse:klcParseImport,commit:klcReplaceMonths,done:()=>{klcImportDialog.close();klcAfterChange()}})
}
